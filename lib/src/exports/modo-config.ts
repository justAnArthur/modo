// shared helper for loading the user's `modo.config.ts` (or .tsx/.js/.mjs).
// used by:
//   - runtime/plugins/user-css.ts  : exposes the config to the docs site
//   - runtime/plugins/components.ts: reads `config.components` to resolve slots
//   - exports/check.ts             : validates the config against the schema
//   - exports/cli.ts               : validates that the config is loadable
//
// the user's config may import from `modo-atomic-ui` or
// `modo-atomic-ui/config` (e.g. for `defineConfig`). we alias both to a
// tiny stub that exports `defineConfig = (c) => c` so the config
// evaluates without pulling in the full lib.
//
// returns the default export of the config, or null if no config file
// was found. throws if a config file exists but failed to load.

import { writeFile, unlink, access } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import * as esbuild from 'esbuild'

const STUB = `export const defineConfig = (c) => c\nexport {}\n`
const CANDIDATES = ['modo.config.ts', 'modo.config.tsx', 'modo.config.js', 'modo.config.mjs'] as const

function tmpPath(prefix: string): string {
  return join(tmpdir(), `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.mjs`)
}

async function safeUnlink(p: string): Promise<void> {
  try { await unlink(p) } catch { /* already gone */ }
}

export async function loadModoConfig(root: string): Promise<unknown> {
  for (const name of CANDIDATES) {
    const p = resolve(root, name)
    // skip non-existent files cleanly — don't trigger an esbuild
    // "could not resolve" error per candidate.
    try { await access(p) } catch { continue }
    const tmpStub = tmpPath('modo-cfg-stub')
    try {
      await writeFile(tmpStub, STUB)
      const result = await esbuild.build({
        entryPoints: [p],
        bundle: true,
        write: false,
        format: 'esm',
        platform: 'node',
        target: 'node20',
        alias: {
          'modo-atomic-ui/config': tmpStub,
          'modo-atomic-ui': tmpStub,
        },
        logLevel: 'silent',
      })
      const code = result.outputFiles?.[0]?.text
      if (!code) throw new Error(`${name}: esbuild produced no output`)
      const tmp = tmpPath('modo-cfg-out')
      await writeFile(tmp, code)
      try {
        const mod = await import(tmp)
        return (mod as { default?: unknown }).default ?? null
      } finally {
        await safeUnlink(tmp)
      }
    } finally {
      await safeUnlink(tmpStub)
    }
  }
  return null
}
