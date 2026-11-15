import { describe, expect, test } from 'bun:test'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { discoverItems } from '../src/node/discover'

describe('discoverItems', () => {
  test('items sit in the tier or down in group folders', () => {
    const tier = mkdtempSync(join(tmpdir(), 'modo-tier-'))
    for (const dir of ['button', 'overlays/dialog', 'overlays/sheet', 'overlays/notes', 'deep/a/b']) {
      mkdirSync(join(tier, dir), { recursive: true })
    }
    for (const dir of ['button', 'overlays/dialog', 'overlays/sheet', 'deep/a/b']) {
      writeFileSync(join(tier, dir, 'index.tsx'), '')
    }
    expect(discoverItems(tier).map(({ id, group }) => ({ id, group }))).toEqual([
      { id: 'button', group: undefined },
      { id: 'b', group: 'deep/a' },
      { id: 'dialog', group: 'overlays' },
      { id: 'sheet', group: 'overlays' },
    ])
  })
})
