import { describe, expect, test } from 'bun:test'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { decodePath, guidePath } from '../src/lib/paths'
import { discoverGuides } from '../src/node/discover-guides'
import { groupTree } from '../src/runtime/groups'

function tree(files: Record<string, string> | string[]): string {
  const root = mkdtempSync(join(tmpdir(), 'modo-guides-'))
  const entries = Array.isArray(files) ? files.map(f => [f, ''] as const) : Object.entries(files)
  for (const [f, body] of entries) {
    mkdirSync(dirname(join(root, f)), { recursive: true })
    writeFileSync(join(root, f), body)
  }
  return root
}

const slugs = (dir: string) => discoverGuides(dir).guides.map(g => [g.slug, g.group])

describe('discoverGuides', () => {
  test('slugs drop .mdx and ordering prefixes; folders are groups, prefixes kept', () => {
    const root = tree(['02-theming/02-dark-mode.mdx', '02-theming/01-tokens.mdx', '01-getting-started.mdx', 'faq.mdx'])
    expect(slugs(root)).toEqual([
      ['getting-started', undefined],
      ['theming/tokens', '02-theming'],
      ['theming/dark-mode', '02-theming'],
      ['faq', undefined],
    ])
  })

  test("a folder's index.mdx is the folder, listed first; the root one is the empty slug", () => {
    const root = tree(['index.mdx', 'theming/01-a.mdx', 'theming/index.mdx', 'theming/deep/index.mdx'])
    expect(slugs(root)).toEqual([
      ['', undefined],
      ['theming', 'theming'],
      ['theming/a', 'theming'],
      ['theming/deep', 'theming/deep'],
    ])
  })

  test('slugs are NFC, whatever form the file system spells them in; spaces stay', () => {
    const root = tree(['návod/začíname.mdx', 'my page.mdx'])
    expect(discoverGuides(root).guides.map(g => g.slug)).toEqual(['my page', 'návod/začíname'])
  })

  test('only .mdx files count', () => {
    const root = tree(['a.mdx', 'b.md', 'c.tsx', 'nested/d.mdx'])
    expect(discoverGuides(root).guides.map(g => g.slug)).toEqual(['a', 'nested/d'])
  })

  test('a slug another guide took is an error and skipped', () => {
    const root = tree(['01-setup.mdx', 'setup.mdx'])
    const { guides, errors } = discoverGuides(root)
    expect(guides.map(g => g.file.endsWith('01-setup.mdx'))).toEqual([true])
    expect(errors).toEqual(['guides/setup.mdx: another guide already has the url /guides/setup; skipped'])
  })

  test('titles and descriptions come from frontmatter, else the file or folder name', () => {
    const root = tree({
      'index.mdx': '',
      '01-getting-started.mdx': '---\ntitle: "Start: here"\ndescription: Install it.\n---\n\n# Hi\n',
      '02-dark-mode/index.mdx': '# No frontmatter\n',
      'plain.mdx': '---\ntitle: 3\n---\n',
    })
    expect(discoverGuides(root).guides.map(({ title, description }) => [title, description])).toEqual([
      ['Guides', undefined],
      ['Start: here', 'Install it.'],
      ['Dark mode', undefined],
      ['Plain', undefined],
    ])
  })

  test('broken frontmatter is a warning, and the guide keeps its file-name title', () => {
    const root = tree({ 'a.mdx': '---\ntitle: [unclosed\n---\n', 'b.mdx': '---\n- a list\n---\n' })
    const { guides, warnings } = discoverGuides(root)
    expect(guides.map(g => g.title)).toEqual(['A', 'B'])
    expect(warnings).toHaveLength(2)
    expect(warnings[1]).toBe('guides/b.mdx: frontmatter is not a mapping; ignored')
  })

  test('no folder, no guides', () => {
    expect(discoverGuides(join(tmpdir(), 'modo-no-such-dir'))).toEqual({ guides: [], errors: [], warnings: [] })
  })
})

describe('guide groups', () => {
  test('an ordering prefix sorts the group and leaves its title; titles name it by its bare name', () => {
    const t = groupTree(
      [
        { id: 'a', group: '02-theming' },
        { id: 'b', group: '01-getting-started' },
        { id: 'c', group: '03-ui' },
      ],
      { ui: 'UI' },
    )
    expect(t.groups.map(g => g.title)).toEqual(['Getting started', 'Theming', 'UI'])
  })
})

describe('guide paths', () => {
  test('guides live under /guides; the empty slug is its root', () => {
    expect(guidePath('')).toBe('/guides')
    expect(guidePath('theming/tokens')).toBe('/guides/theming/tokens')
  })

  test('escaped and spaced paths match their slugs', () => {
    expect(decodePath('/ui/guides/n%C3%A1vod/za%C4%8D%C3%ADname')).toBe('/ui/guides/návod/začíname')
    expect(decodePath(encodeURI('/guides/my page'))).toBe('/guides/my page')
    expect(decodePath('/na%CC%81vod')).toBe('/návod')
  })

  test('a malformed escape is left as is', () => {
    expect(decodePath('/bad%E0%A4%A')).toBe('/bad%E0%A4%A')
  })
})
