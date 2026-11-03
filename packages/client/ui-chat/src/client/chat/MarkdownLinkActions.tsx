/** Inline plugin actions use the same Session binding as their Markdown owner. */
import type { FactoryComponentPropsOf } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-primitives'

/**
 * Render registered actions without changing the original anchor.
 * @param props - Link URL and child renderer.
 * @returns Inline action entries.
 */
export function MarkdownLinkActions({ href, renderSlot }: FactoryComponentPropsOf<'markdown.link.actions'>) {
  return renderSlot('markdown.link.actions.items', { href })
}
