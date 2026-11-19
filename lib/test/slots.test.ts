import { describe, expect, test } from 'bun:test'
import { type BuiltSlot, type MatchableItem, resolveShellSlots } from '../src/plugins/slots'

const item = (tier: MatchableItem['tier'], name: string, props: string[]): MatchableItem => ({
  name,
  id: name.toLowerCase(),
  tier,
  props: props.map(name => ({ name })),
  bundlePath: `/items/${name}.mjs`,
})

const pinned = (bundlePath: string): BuiltSlot => ({
  source: 'config',
  bundlePath,
  exportName: 'default',
  cssFiles: [],
})

describe('resolveShellSlots', () => {
  test('unmatched slots are one summary warning, a matched one is not named', () => {
    const { shell, warnings } = resolveShellSlots({}, [item('primitives', 'Button', ['children'])], () => null)
    expect([shell.Button.source, warnings]).toEqual([
      'interface-match',
      [
        'Plain fallbacks for Link, Code, Select, Icon, Sidebar: no item matches by name and required props, and modo.config.ts `shell` pins none',
      ],
    ])
  })

  test('an empty project is silent', () => {
    expect(resolveShellSlots({}, [], () => null).warnings).toEqual([])
  })

  test('a match needs the tier, the name and every required prop', () => {
    const { shell } = resolveShellSlots(
      {},
      [item('components', 'Button', ['children']), item('primitives', 'Link', ['href'])],
      () => null,
    )
    expect([shell.Button, shell.Link]).toEqual([
      { source: 'fallback', fallbackName: 'PlainButton' },
      { source: 'fallback', fallbackName: 'PlainLink' },
    ])
  })

  test('a pin wins over a match', () => {
    const { shell } = resolveShellSlots(
      { shell: { Button: './x.tsx' } },
      [item('primitives', 'Button', ['children'])],
      ref => (ref === './x.tsx' ? pinned('/usr/x.mjs') : null),
    )
    expect(shell.Button).toEqual(pinned('/usr/x.mjs'))
  })

  test('a pin that does not load warns, then falls back to matching', () => {
    const { shell, warnings } = resolveShellSlots(
      { shell: { Button: './missing.tsx' } },
      [item('primitives', 'Button', ['children'])],
      () => null,
    )
    expect(shell.Button.source).toBe('interface-match')
    expect(warnings[0]).toBe('Shell slot "Button" is pinned to "./missing.tsx", which didn\'t load')
  })

  test('a matched Sidebar root owns its parts: members stay plain', () => {
    const { shell } = resolveShellSlots(
      {},
      [
        item('components', 'Sidebar', ['children']),
        item('components', 'Item', ['href', 'children']),
        item('components', 'Section', ['title', 'children']),
      ],
      () => null,
    )
    expect(shell.Sidebar).toEqual({
      Root: { source: 'interface-match', bundlePath: '/items/Sidebar.mjs', exportName: 'default', cssFiles: [] },
      Item: { source: 'fallback', fallbackName: 'PlainSidebarItem' },
      Section: { source: 'fallback', fallbackName: 'PlainSidebarSection' },
    })
  })

  test('without a root, members match on their own and never read the root pin', () => {
    const asked: string[] = []
    const { shell, warnings } = resolveShellSlots(
      { shell: { Sidebar: './nav.tsx' } },
      [item('components', 'Item', ['href', 'children'])],
      ref => {
        asked.push(ref)
        return null
      },
    )
    expect(asked).toEqual(['./nav.tsx'])
    expect([shell.Sidebar.Root.source, shell.Sidebar.Item.source, shell.Sidebar.Section.source]).toEqual([
      'fallback',
      'interface-match',
      'fallback',
    ])
    expect(warnings.filter(w => w.startsWith('Shell slot'))).toHaveLength(1)
  })

  test('SiteSwitcher pins or matches like the others, and its fallback is not in the summary', () => {
    const switcher = item('components', 'SiteSwitcher', ['pages', 'sections'])
    const matched = resolveShellSlots({}, [switcher], () => null).shell.SiteSwitcher
    const pin = resolveShellSlots({ shell: { SiteSwitcher: './s.tsx' } }, [switcher], () => pinned('/usr/s.mjs'))
    const plain = resolveShellSlots({}, [item('primitives', 'Button', ['children'])], () => null)
    expect([matched.source, pin.shell.SiteSwitcher, plain.shell.SiteSwitcher]).toEqual([
      'interface-match',
      pinned('/usr/s.mjs'),
      { source: 'fallback', fallbackName: 'PlainSiteSwitcher' },
    ])
    expect(plain.warnings.join()).not.toContain('SiteSwitcher')
  })
})
