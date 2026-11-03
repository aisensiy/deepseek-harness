/** Real Loader composition: inline actions retain navigation and edit only the bound draft. */
import type {} from '@deepseek-ai/dsh-api-session-controller'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import { chromium } from 'playwright'
import { expect, it, onTestFinished } from 'vitest'
import { createAssistantMessage, createUserMessage } from '@deepseek-ai/dsh-llm'
import { Session, SessionId, SESSION_FORMAT_VERSION } from '@deepseek-ai/dsh-session'
import { acknowledgeReloadConnectionLoss, captureStableAria, compareOrRefreshGolden, launchWebScaffold, readPersistedEvents, seedSession, watchConsole, webSnapshotMode } from './scaffold.ts'
import { newEnglishPage, saveFailureShot } from './support.ts'

const FIXTURE = fileURLToPath(new URL('./fixtures/plugins/fixture-link-actions', import.meta.url))
const EXPECTED = fileURLToPath(new URL('./expected/markdown-link-actions/actions.expected.md', import.meta.url))
const HREF = 'https://resources.example.test/project/42'

function history(): string {
  const session = Session.create(SessionId('markdown-link-actions-source'))
  session.append('turn/start', { turn: 1 })
  const user = session.append('user/message', createUserMessage({ content: [{ type: 'text', text: 'List resources.' }], source: { kind: 'user' } }), { surfaceOp: 'append' })
  session.append('session/title', { title: 'Link action example', messageSeqs: [user.seq], source: { kind: 'fallback' } })
  session.append('step/start', { turn: 1, step: 1 })
  session.append('assistant/message', { stream: [], turn: 1, step: 1,
    message: createAssistantMessage({ content: [{ type: 'text', text: `- [Resource 42](${HREF})\n- [Unclaimed link](https://other.example.test/guide)` }], source: { provider: 'deepseek-official', model: 'deepseek-v4-flash' } }),
  }, { surfaceOp: 'append' })
  session.append('step/end', { turn: 1, step: 1 })
  session.append('turn/end', { turn: 1, reason: { kind: 'completed' } })
  return [JSON.stringify({ type: 'session', version: SESSION_FORMAT_VERSION, id: '{{sessionId}}', createdAt: 0, cwd: '{{cwd}}', isSeeded: false, delegationDepth: 0 }),
    ...session.snapshotEvents().map(event => JSON.stringify({ ...event, time: 1_700_000_000_000 + event.seq * 1000 })), ''].join('\n')
}

it('adds a reference beside a link, retains an existing draft across reload, and releases its action on unload', async () => {
  const scaffold = await launchWebScaffold({ extraInstallAnchors: [join(FIXTURE, 'package.json')] })
  onTestFinished(() => scaffold.close())
  const workspace = await scaffold.ctx.workspaceRegistry.create(scaffold.workspaceCwd)
  const sessionId = await seedSession(scaffold, history(), 'session-60633456-26b2-4d70-b4a0-7226713c4d02')
  await workspace.attachSession(sessionId)
  await scaffold.ctx.sessionController.rename({ sessionId, title: 'Link action example' })
  const catalog = await scaffold.ctx.sessionController.list({}, new AbortController().signal)
  expect(catalog.items.some(row => row.sessionId === sessionId)).toBe(true)
  const entryId = await scaffold.ctx.loader.create({ name: '@fixture/link-actions' })
  const executablePath = process.env.DSH_PLAYWRIGHT_EXECUTABLE_PATH
  const browser = await chromium.launch(executablePath === undefined ? {} : { executablePath })
  onTestFinished(() => browser.close())
  const page = await newEnglishPage(browser)
  const console = watchConsole(page)
  try {
    await page.goto(scaffold.authenticatedUrl, { waitUntil: 'load' })
    await page.locator('[data-dsh-boot]').waitFor({ state: 'detached', timeout: 20_000 })
    const sessionRow = page.getByRole('treeitem').filter({ has: page.getByText('Link action example', { exact: true }) })
    await sessionRow.waitFor({ timeout: 20_000 })
    await sessionRow.click()
    const anchor = page.getByRole('link', { name: 'Resource 42', exact: true })
    const action = page.getByRole('button', { name: 'Reference Resource 42', exact: true })
    await action.waitFor({ timeout: 20_000 })
    expect(await anchor.getAttribute('href')).toBe(HREF)
    expect(await action.evaluate(element => element.closest('a') === null && element.closest('li') !== null)).toBe(true)
    expect(await page.getByRole('button', { name: 'Reference Resource 42', exact: true }).count()).toBe(1)
    await compareOrRefreshGolden(EXPECTED, await captureStableAria(page, '[data-conversation-scroll]', scaffold.workspaceCwd), webSnapshotMode())
    const input = page.locator('[data-composer-input][contenteditable="true"]')
    await input.fill('Please inspect ')
    await input.press('ControlOrMeta+A')
    await action.click()
    await expect.poll(() => input.textContent()).toContain('Please inspect ')
    await expect.poll(() => input.textContent()).toContain('Resource 42')
    expect(await input.evaluate(element => document.activeElement === element)).toBe(true)
    expect(await page.locator('html').getAttribute('data-fixture-reference-serialized')).toBeNull()
    const warningStart = console.warnings.length
    await page.reload({ waitUntil: 'load' })
    await expect.poll(() => input.textContent()).toContain('Please inspect ')
    await expect.poll(() => input.textContent()).toContain('Resource 42')
    expect(await page.locator('html').getAttribute('data-fixture-reference-serialized')).toBeNull()
    acknowledgeReloadConnectionLoss(console, warningStart)
    scaffold.ctx.loader.remove(entryId)
    await expect.poll(() => action.count()).toBe(0)
    expect(await anchor.getAttribute('href')).toBe(HREF)
    await expect.poll(() => input.textContent()).toContain('Resource 42')
    expect((await readPersistedEvents(scaffold, sessionId)).filter(event => event.type === 'user/message')).toHaveLength(1)
    expect(console.pageErrors).toEqual([])
    expect(console.warnings).toEqual([])
  } catch (error) {
    await saveFailureShot(page, 'web-e2e-markdown-link-actions')
    throw error
  }
})
