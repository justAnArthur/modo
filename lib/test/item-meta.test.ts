import { describe, expect, test } from 'bun:test'
import { credits, itemMeta, repoBlobUrl, sourceLink } from '../src/lib/item-meta'
import { parseItemSource } from '../src/lib/tsdoc'

describe('itemMeta', () => {
  test('several sources and licenses, in order', () => {
    const r = itemMeta(
      parseItemSource(
        `/**\n * Doc.\n * @source https://github.com/a/b\n * @source https://github.com/c/d abc123\n * @license MIT © A\n * @license MIT © C\n */\nexport default function X() {}`,
      ).tags,
    )
    expect(r.sources).toEqual([
      { href: 'https://github.com/a/b', label: 'github.com/a/b' },
      { href: 'https://github.com/c/d', label: 'abc123' },
    ])
    expect(r.licenses).toEqual(['MIT © A', 'MIT © C'])
  })

  test('@status wins over a modifier; a bare @deprecated is still deprecated', () => {
    const r = itemMeta([
      { tag: 'beta', text: '' },
      { tag: 'status', text: 'stable' },
      { tag: 'deprecated', text: '' },
      { tag: 'since', text: '1.2' },
    ])
    expect([r.status, r.deprecated, r.since]).toEqual(['stable', '', '1.2'])
    expect(itemMeta([{ tag: 'alpha', text: '' }]).status).toBe('alpha')
  })

  test('a source label may have spaces', () => {
    expect(sourceLink('https://x.dev/y Fluid Functionalism')).toEqual({
      href: 'https://x.dev/y',
      label: 'Fluid Functionalism',
    })
  })
})

describe('repoBlobUrl', () => {
  test('defaults to main at the repo root', () => {
    expect(repoBlobUrl({ url: 'https://github.com/me/ds/' }, 'components/button/index.tsx')).toBe(
      'https://github.com/me/ds/blob/main/components/button/index.tsx',
    )
  })

  test('a branch and a subfolder', () => {
    expect(repoBlobUrl({ url: 'https://github.com/me/ds', branch: 'dev', dir: '/ui/' }, 'a/index.tsx')).toBe(
      'https://github.com/me/ds/blob/dev/ui/a/index.tsx',
    )
  })
})

describe('credits', () => {
  test('upstreams gathered once across items, nth license to nth source, repo root links', () => {
    const ff = { tag: 'source', text: 'https://github.com/micka/ff/blob/abc/button.tsx Fluid' }
    const mit = { tag: 'license', text: 'MIT © Micka' }
    expect(
      credits([
        [ff, mit],
        [ff, mit],
        [
          { tag: 'source', text: 'https://github.com/a/beui/blob/x/p.tsx beUI' },
          { tag: 'source', text: 'https://github.com/b/mp/blob/y/p.tsx mp' },
          { tag: 'license', text: 'MIT © A' },
          { tag: 'license', text: 'MIT © B' },
        ],
        [{ tag: 'since', text: '1.0' }],
      ]),
    ).toEqual([
      { label: 'Fluid', href: 'https://github.com/micka/ff', licenses: ['MIT © Micka'], items: 2 },
      { label: 'beUI', href: 'https://github.com/a/beui', licenses: ['MIT © A'], items: 1 },
      { label: 'mp', href: 'https://github.com/b/mp', licenses: ['MIT © B'], items: 1 },
    ])
  })

  test('a non-URL @source is credited as written', () => {
    expect(credits([[{ tag: 'source', text: 'shadcn/ui' }]])).toEqual([
      { label: 'shadcn/ui', href: 'shadcn/ui', licenses: [], items: 1 },
    ])
  })
})
