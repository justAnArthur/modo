import { describe, expect, test } from 'bun:test'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import mdx from '@mdx-js/esbuild'
import { build } from 'esbuild'
import remarkGfm from 'remark-gfm'
import { headingRole, isGrouped } from '../src/lib/example-groups'
import { remarkModoExamples } from '../src/plugins/mdx-examples'

const h = (depth: number) => ({ type: 'heading', depth })

describe('isGrouped', () => {
  test('a file with only `#` examples is flat', () => {
    expect(isGrouped([h(1), { type: 'mdxJsxFlowElement' }, h(1), h(3)])).toBe(false)
  })

  test('a `##` makes the file grouped', () => {
    expect(isGrouped([h(1), h(2), { type: 'mdxJsxFlowElement' }])).toBe(true)
  })

  test('nothing but a `##` is enough: a group is not required', () => {
    expect(isGrouped([h(2)])).toBe(true)
  })

  test('only headings count', () => {
    expect(isGrouped([{ type: 'paragraph', depth: 2 }, { type: 'code' }])).toBe(false)
  })
})

describe('headingRole', () => {
  test('flat: `#` is an example at h3, `###` a sub-heading at h4', () => {
    expect(headingRole(1, false)).toEqual({ kind: 'example', level: 3 })
    expect(headingRole(3, false)).toEqual({ kind: 'sub', level: 4 })
  })

  test('grouped: `#` is a group at h3, `##` an example at h4, `###` a sub-heading below the TOC', () => {
    expect(headingRole(1, true)).toEqual({ kind: 'group', level: 3 })
    expect(headingRole(2, true)).toEqual({ kind: 'example', level: 4 })
    expect(headingRole(3, true)).toEqual({ kind: 'sub', level: 5 })
  })
})

// Compiles through the bundle's esbuild + MDX path; returns the JSX it emits.
async function compileMdx(source: string): Promise<string> {
  const dir = mkdtempSync(join(tmpdir(), 'modo-groups-'))
  const file = join(dir, 'examples.mdx')
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
  test('a flat file leaves its headings unmarked', async () => {
    const js = await compileMdx('# One\n\n<div />\n\n### Sub\n')
    expect(js).not.toContain('data-grouped')
  })

  test('a grouped file marks every heading, so the runtime need not guess', async () => {
    const js = await compileMdx('# Group\n\n## One\n\n<div />\n\n### Sub\n')
    expect(js.match(/"data-grouped": true/g)).toHaveLength(3)
  })

  test('the examples stay live blocks next to the headings', async () => {
    const js = await compileMdx('# Group\n\n## One\n\n<div />\n')
    expect(js).toContain('ModoExample')
  })
})
