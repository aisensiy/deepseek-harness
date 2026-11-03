/** Data supplied beside one settled, sanitized HTTP(S) Markdown link. */
export interface MarkdownLinkActionsOwner {
  readonly href: string
}

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface SlotFactoryMap {
    /** Inline action surface; the original anchor remains owned by Markdown. */
    'markdown.link.actions': {
      scope: 'session'
      props: MarkdownLinkActionsOwner
      children: {
        'markdown.link.actions.items': { kind: 'list'; scope: 'session'; inline: true }
      }
    }
  }
  interface SlotMap {
    /** Plugin-owned actions; navigation and resource interpretation stay separate. */
    'markdown.link.actions.items': {
      kind: 'list'
      scope: 'session'
      inline: true
      owner: MarkdownLinkActionsOwner
    }
  }
}
