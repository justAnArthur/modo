import { describe, expect, test } from 'bun:test'
import { resolveShellSlots } from '../src/plugins/slots'

describe('resolveShellSlots', () => {
  test('unmatched slots are one summary warning, a matched one is not named', async () => {
    const warnings: string[] = []
    const button = {
      name: 'Button',
      id: 'button',
      tier: 'primitives' as const,
      props: [{ name: 'children', optional: true }],
      bundleUrl: '/b.mjs',
    }
    const shell = await resolveShellSlots({}, [button], async () => null, { warnings })
    expect([shell.Button.source, warnings]).toEqual([
      'interface-match',
      [
        'Plain fallbacks for Link, Code, Select, Icon, Sidebar: no item matches by name and required props, and modo.config.ts `shell` pins none',
      ],
    ])
  })
})
