window.__ModuleLoader__.load({
  id: '@fixture/link-actions',
  factory(require) {
    const React = require('react')
    const URL = 'https://resources.example.test/project/42'
    function Reference({ href, inputActions, useInput }) {
      const phase = useInput(state => state.phase)
      if (href !== URL) return null
      return React.createElement('button', {
        type: 'button', disabled: !['plain', 'claimed'].includes(phase),
        onMouseDown: event => event.preventDefault(),
        onClick: () => {
          const selection = inputActions.captureInsertion()
          const applied = inputActions.insertReference({ source: 'fixture-resource', ref: 'project:42', label: 'Resource 42', clipboardText: 'project:42' }, { ...selection, start: selection.end })
          if (applied) { inputActions.persistDraft(); inputActions.focus() }
        },
      }, 'Reference Resource 42')
    }
    return {
      inject: ['slots', 'inputTriggers'],
      apply(ctx) {
        ctx.effect(() => ctx.inputTriggers.registerSource({
          trigger: '@', name: 'fixture-resource', candidates: async () => [], onPick: () => undefined,
          codec: { clipboardText: ref => ref, serialize: async ref => {
            document.documentElement.dataset.fixtureReferenceSerialized = 'yes'
            return `Resource reference: ${ref}`
          } },
        }))
        ctx.slots.inject('markdown.link.actions.items', () => ctx.slots.register({ name: 'markdown.link.actions.items', id: 'fixture-resource' }, Reference))
      },
    }
  },
})
