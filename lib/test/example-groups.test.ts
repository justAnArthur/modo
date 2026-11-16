import { describe, expect, test } from 'bun:test'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import mdx from '@mdx-js/esbuild'
import { build } from 'esbuild'
import remarkGfm from 'remark-gfm'
import { headingRoles } from '../src/lib/example-groups'
import { remarkModoExamples } from '../src/plugins/mdx-examples'

const group = { kind: 'group', level: 3 }
const example = { kind: 'example', level: 3 }
const grouped = { kind: 'example', level: 4 }

describe('headingRoles', () => {
  test('a file without `##` is flat: `#` examples at h3, `###` sub-headings at h4', () => {
    expect(headingRoles([1, 3, 1])).toEqual([example, { kind: 'sub', level: 4 }, example])
  })

  test('a `#` followed by `##` is a group, its `##` examples at h4, their `###` at h5', () => {
    expect(headingRoles([1, 2, 3, 2])).toEqual([group, grouped, { kind: 'sub', level: 5 }, grouped])
  })

  test('only the `#` sections with a `##` group; the rest stay flat examples', () => {
    expect(headingRoles([1, 1, 2, 2, 1])).toEqual([example, group, grouped, grouped, example])
  })

  test('a `###` between a group and its first `##` sits under the group', () => {
    expect(headingRoles([1, 3, 2])).toEqual([group, { kind: 'sub', level: 4 }, grouped])
  })

  test('a `##` before any `#` is an ungrouped example', () => {
    expect(headingRoles([2, 1, 2])).toEqual([example, group, grouped])
  })

  test('a leading `###` is a sub-heading at h4', () => {
    expect(headingRoles([3])).toEqual([{ kind: 'sub', level: 4 }])
  })
})

// Compiles through the bundle's esbuild + MDX path; returns the JS it emits.
async function compileMdx(source: string): Promise<string> {
  const file = join(mkdtempSync(join(tmpdir(), 'modo-groups-')), 'examples.mdx')
  writeFileSync(file, source)
  const out = await build({
    entryPoints: [file],
    write: false,
    format: 'esm',
    jsx: 'automatic',
    plugins: [mdx({ remarkPlugins: [remarkGfm, remarkModoExamples], jsxImportSource: 'react' })],
  })
  return out.outputFiles[0]!.text
}

describe('remarkModoExamples headings', () => {
  test('each top-level heading carries its role and level', async () => {
    const js = await compileMdx('# Group\n\n## One\n\n<div />\n\n### Sub\n\n# Flat\n\n<div />\n')
    const marks = [...js.matchAll(/"data-kind": "(\w+)",\s*"data-level": "(\d)"/g)].map(m => `${m[1]}@${m[2]}`)
    expect(marks).toEqual(['group@3', 'example@4', 'sub@5', 'example@3'])
  })

  test('the examples stay live blocks next to the headings', async () => {
    expect(await compileMdx('# Group\n\n## One\n\n<div />\n')).toContain('ModoExample')
  })
})
