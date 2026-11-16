import { afterAll, describe, expect, spyOn, test } from 'bun:test'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { createBundler } from '../src/plugins/bundle'
import { tokensPlugin } from '../src/plugins/tokens'

const roots: string[] = []
afterAll(() => {
  for (const root of roots) rmSync(root, { recursive: true, force: true })
})

function project(files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), 'modo-root-'))
  roots.push(root)
  for (const [rel, text] of Object.entries(files)) {
    mkdirSync(dirname(join(root, rel)), { recursive: true })
    writeFileSync(join(root, rel), text)
  }
  return root
}

async function build(root: string) {
  const stderr = spyOn(process.stderr, 'write').mockImplementation(() => true)
  try {
    const result = await createBundler({ userRoot: root, configPath: join(root, 'modo.config.ts') }).get()
    return { result, stderr: stderr.mock.calls.map(c => String(c[0])).join('') }
  } finally {
    stderr.mockRestore()
  }
}

async function tokenGroups(root: string): Promise<string[]> {
  const plugin = tokensPlugin({ userRoot: root, configPath: join(root, 'modo.config.ts') })
  const load = plugin.load as (this: unknown, id: string) => Promise<string>
  const code = await load.call({}, '\0virtual:modo-tokens')
  const groups = JSON.parse(code.replace(/^export const tokens = |;$/g, '')) as Array<{ name: string }>
  return groups.map(g => g.name)
}

describe('root', () => {
  test('items and tokens come from the root; paths stay relative to the project, shell refs too', async () => {
    const root = project({
      'modo.config.ts': `export default { name: 'T', root: 'src', shell: { Link: './docs.tsx#Link' } }`,
      'docs.tsx': 'export function Link() { return null }',
      'src/primitives/inside/index.tsx': 'export default function Inside() { return null }',
      'src/tokens/colors.css': ':root { --primary: red; }',
      'primitives/outside/index.tsx': 'export default function Outside() { return null }',
      'tokens/spacing.css': ':root { --space-1: 4px; }',
    })
    const { result } = await build(root)
    expect(result.items.map(it => [it.id, it.path])).toEqual([['inside', 'src/primitives/inside/index.tsx']])
    expect(result.extras.get('./docs.tsx#Link')?.exported).toBe(true)
    expect(await tokenGroups(root)).toEqual(['colors'])
  })

  test('unset, the project root holds them', async () => {
    const root = project({
      'modo.config.ts': `export default { name: 'T' }`,
      'primitives/a/index.tsx': 'export default function A() { return null }',
      'tokens/spacing.css': ':root { --space-1: 4px; }',
    })
    expect((await build(root)).result.items.map(it => it.path)).toEqual(['primitives/a/index.tsx'])
    expect(await tokenGroups(root)).toEqual(['spacing'])
  })

  test('a root that does not exist is an error', async () => {
    const root = project({ 'modo.config.ts': `export default { name: 'T', root: 'nope' }` })
    const { result, stderr } = await build(root)
    expect(result.errorCount).toBe(1)
    expect(stderr).toContain('root "nope" not found')
  })
})
