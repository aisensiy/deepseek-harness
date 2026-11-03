/** Late input insertions preserve references, subsequent edits, and undo ownership. */
import { Context } from '@deepseek-ai/cordis'
import { UNDO_COMMAND } from 'lexical'
import { expect, it, vi } from 'vitest'
import { SessionInputShell } from '../src/client/input/facade.ts'

function shell(): SessionInputShell {
  return new SessionInputShell({ actx: new Context(), defaultSink: vi.fn(), commandAttachments: {
    serialize: async () => [], release: () => {}, unsupportedNotice: () => '',
  } })
}

it('inserts text beside an existing reference and undoes only that insertion', async () => {
  const input = shell()
  try {
    input.setDraft('@ref')
    input.insertReference({ source: 'file', ref: 'src/main.ts', label: 'main.ts', clipboardText: '@[main.ts](src/main.ts)' },
      { start: 0, end: 4, draftRev: input.state.getSnapshot().draftRev })
    const original = input.state.getSnapshot()
    expect(input.actions.insertText(' check types', input.actions.captureInsertion())).toBe(true)
    expect(input.state.getSnapshot().draft).toContain('check types')
    expect(input.state.getSnapshot().occurrences).toEqual(original.occurrences)
    input.editor.dispatchCommand(UNDO_COMMAND, undefined)
    await vi.waitFor(() => { expect(input.state.getSnapshot().draft).toBe(original.draft) })
  } finally { input.dispose() }
})

it('refuses results captured before a user edit or after editor disposal', () => {
  const input = shell()
  input.setDraft('before')
  const span = input.actions.captureInsertion()
  input.setDraft('my newer text')
  expect(input.actions.insertText('late voice', span)).toBe(false)
  expect(input.state.getSnapshot().draft).toBe('my newer text')
  const latest = input.actions.captureInsertion()
  input.dispose()
  expect(input.actions.insertText('late voice', latest)).toBe(false)
})

it('inserts a reference through public actions without replacing text or accepting stale results', () => {
  const input = shell()
  const focus = vi.spyOn(input, 'focus').mockImplementation(() => {})
  const reference = { source: 'resource', ref: 'project:42', label: 'Tutorial', clipboardText: '[Tutorial](https://example.com/42)' }
  try {
    input.setDraft('Inspect ')
    const stale = input.actions.captureInsertion()
    input.setDraft('My newer instruction ')
    expect(input.actions.insertReference(reference, stale)).toBe(false)
    expect(input.state.getSnapshot().draft).toBe('My newer instruction ')
    expect(input.actions.insertReference(reference, input.actions.captureInsertion())).toBe(true)
    expect(input.state.getSnapshot().draft).toContain('My newer instruction ')
    expect(input.state.getSnapshot().occurrences).toHaveLength(1)
    expect(input.state.getSnapshot().phase).toBe('plain')
    input.actions.focus()
    expect(focus).toHaveBeenCalledOnce()
    const latest = input.actions.captureInsertion()
    input.dispose()
    expect(input.actions.insertReference(reference, latest)).toBe(false)
    input.actions.focus()
    expect(focus).toHaveBeenCalledOnce()
  } finally { input.dispose() }
})
