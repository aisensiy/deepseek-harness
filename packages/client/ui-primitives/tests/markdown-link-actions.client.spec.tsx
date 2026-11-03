// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { MarkdownDelegateProvider } from '../src/index.ts'
import { MarkdownText } from './markdown-test-components.tsx'

afterEach(cleanup)

it('adds sibling actions for settled HTTP links without changing their activation', () => {
  const open = vi.fn()
  const renderFactorySlot = vi.fn(() => <button>Reference</button>)
  const { container } = render(
    <MarkdownDelegateProvider openExternalLink={open} renderFactorySlot={renderFactorySlot}>
      <MarkdownText text={'- [Tutorial](https://example.com/tutorial/42)\n- [Mail](mailto:test@example.com)\n- [Unsafe](javascript:alert%281%29)\n- [![Preview](https://example.com/a.png)](https://example.com/image)'} />
    </MarkdownDelegateProvider>,
  )
  const anchor = screen.getByRole('link', { name: 'Tutorial' })
  const action = screen.getByRole('button', { name: 'Reference' })
  expect(anchor.parentElement).toBe(action.parentElement)
  expect(anchor.contains(action)).toBe(false)
  expect(renderFactorySlot).toHaveBeenCalledExactlyOnceWith('markdown.link.actions', { href: 'https://example.com/tutorial/42' })
  fireEvent.click(action)
  expect(open).not.toHaveBeenCalled()
  fireEvent.click(anchor)
  expect(open).toHaveBeenCalledExactlyOnceWith('https://example.com/tutorial/42')
  expect(container.querySelectorAll('li')).toHaveLength(4)
})

it('waits for settlement before adding link actions', () => {
  const renderFactorySlot = vi.fn(() => <button>Reference</button>)
  const source = '[Tutorial](https://example.com/tutorial/42)'
  const { rerender } = render(
    <MarkdownDelegateProvider renderFactorySlot={renderFactorySlot}>
      <MarkdownText text={source} streaming />
    </MarkdownDelegateProvider>,
  )
  expect(screen.queryByRole('button')).toBeNull()
  expect(renderFactorySlot).not.toHaveBeenCalled()
  rerender(
    <MarkdownDelegateProvider renderFactorySlot={renderFactorySlot}>
      <MarkdownText text={source} />
    </MarkdownDelegateProvider>,
  )
  expect(screen.getByRole('button', { name: 'Reference' })).toBeTruthy()
})

it('updates and removes action factories beside already cached Markdown links', () => {
  const source = '[Tutorial](https://example.com/tutorial/42)'
  const { rerender } = render(
    <MarkdownDelegateProvider renderFactorySlot={() => <button>First</button>}>
      <MarkdownText text={source} />
    </MarkdownDelegateProvider>,
  )
  expect(screen.getByRole('button', { name: 'First' })).toBeTruthy()
  rerender(
    <MarkdownDelegateProvider renderFactorySlot={() => <button>Second</button>}>
      <MarkdownText text={source} />
    </MarkdownDelegateProvider>,
  )
  expect(screen.queryByRole('button', { name: 'First' })).toBeNull()
  expect(screen.getByRole('button', { name: 'Second' })).toBeTruthy()
  rerender(<MarkdownDelegateProvider><MarkdownText text={source} /></MarkdownDelegateProvider>)
  expect(screen.queryByRole('button')).toBeNull()
  expect(screen.getByRole('link', { name: 'Tutorial' })).toBeTruthy()
})
