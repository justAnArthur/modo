import { afterAll, describe, expect, spyOn, test } from 'bun:test'
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { createBundler } from '../src/plugins/bundle'

const roots: string[] = []
afterAll(() => {
  for (const root of roots) rmSync(root, { recursive: true, force: true })
})

function project(files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), 'modo-bundle-'))
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
    const bundler = createBundler({ userRoot: root, configPath: join(root, 'modo.config.ts') })
    return { bundler, result: await bundler.get(), stderr: stderr.mock.calls.map(c => String(c[0])).join('') }
  } finally {
    stderr.mockRestore()
  }
}

describe('createBundler', () => {
  test('a broken item is skipped and counted; the rest still build', async () => {
    const root = project({
      'modo.config.ts': `export default { name: 'T' }`,
      'primitives/good/index.tsx': `export default function Good() { return <b /> }`,
      'primitives/bad/index.tsx': `export default function Bad() { return <b }`,
    })
    const { result, stderr } = await build(root)
    expect(result.items.map(it => it.id)).toEqual(['good'])
    expect(result.errorCount).toBe(1)
    expect(stderr).toContain('[modo:bundle] 1 error(s) — skipped: items/primitives/bad')
  })

  test('a rebuild sweeps outputs it no longer writes', async () => {
    const root = project({
      'modo.config.ts': `export default { name: 'T' }`,
      'primitives/a/index.tsx': `export default function A() { return null }`,
    })
    const { bundler, result } = await build(root)
    const stale = result.items[0]!.bundlePath
    rmSync(join(root, 'primitives/a'), { recursive: true })
    mkdirSync(join(root, 'primitives/b'))
    writeFileSync(join(root, 'primitives/b/index.tsx'), `export default function B() { return null }`)
    bundler.invalidate()
    const next = await bundler.get()
    expect([existsSync(stale), next.items.map(it => it.id), existsSync(next.items[0]!.bundlePath)]).toEqual([
      false,
      ['b'],
      true,
    ])
  })

  test('refs into one file share its entry; each knows whether its export exists', async () => {
    const root = project({
      'modo.config.ts': `export default { name: 'T', shell: { Select: './docs.tsx#Select', Icon: './docs.tsx#Icon', Link: './docs.tsx#Gone' } }`,
      'docs.tsx': `export function Select() { return null }\nexport function Icon() { return null }`,
    })
    const { result } = await build(root)
    const select = result.extras.get('./docs.tsx#Select')!
    expect(result.extras.get('./docs.tsx#Icon')!.bundlePath).toBe(select.bundlePath)
    expect([select.exported, result.extras.get('./docs.tsx#Gone')!.exported]).toEqual([true, false])
  })

  test('an examples export named like an item warns', async () => {
    const root = project({
      'modo.config.ts': `export default { name: 'T', examples: './scope' }`,
      'scope.ts': `export const Button = 1\nexport const Plus = 2`,
      'primitives/button/index.tsx': `export default function Button() { return null }`,
    })
    const { result, stderr } = await build(root)
    expect(result.scope?.exports).toEqual(['Button', 'Plus'])
    expect(stderr).toContain('[modo:bundle] warning: examples export "Button" collides with the item "Button"')
  })
})
