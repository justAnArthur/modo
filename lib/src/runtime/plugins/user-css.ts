// reads `modo.config.ts` once and exposes two virtual modules:
//   - virtual:modo-user-css   : the CSS file referenced from config.css
//   - virtual:modo-config     : the full config object (name, description,
//                                theme, meta, components map) for the layout
//                                and per-page renderers
//
// if the user doesn't set `css`, the user-css module exports an empty
// string. the config module exports an empty object so consumers can
// always destructure without nullish handling.

import type { Plugin } from 'vite'
import { readFile, writeFile, unlink } from 'node:fs/promises'
import { resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import * as esbuild from 'esbuild'

export interface UserCssPluginOptions {
  root: string  // user's project root
}

const VIRTUAL_USER_CSS = 'virtual:modo-user-css'
const VIRTUAL_CONFIG = 'virtual:modo-config'
const RESOLVED_USER_CSS = '\0' + VIRTUAL_USER_CSS
const RESOLVED_CONFIG = '\0' + VIRTUAL_CONFIG

async function safeUnlink(p: string): Promise<void> {
  try { await unlink(p) } catch { /* already gone */ }
}

async function loadModoConfig(root: string): Promise<unknown> {
  const candidates = ['modo.config.ts', 'modo.config.tsx']
  for (const name of candidates) {
    const p = resolve(root, name)
    try {
      const stub = `export const defineConfig = (c) => c\nexport {}\n`
      const tmpStub = join(tmpdir(), `modo-cfg-stub-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.mjs`)
      await writeFile(tmpStub, stub)
      try {
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
        if (!code) continue
        const tmp = join(tmpdir(), `modo-cfg-out-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.mjs`)
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
    } catch {
      // try next candidate
    }
  }
  return null
}

export function userCssPlugin(options: UserCssPluginOptions): Plugin {
  return {
    name: 'modo-atomic-ui:user-css',
    enforce: 'pre',

    resolveId(id) {
      if (id === VIRTUAL_USER_CSS) return RESOLVED_USER_CSS
      if (id === VIRTUAL_CONFIG) return RESOLVED_CONFIG
      return null
    },

    async load(id) {
      const config = await loadModoConfig(options.root)
      if (id === RESOLVED_CONFIG) {
        return `export const config = ${JSON.stringify(config ?? {})};\nexport const name = ${JSON.stringify((config as { name?: string } | null)?.name ?? 'modo-atomic-ui')};\nexport const description = ${JSON.stringify((config as { description?: string } | null)?.description ?? '')};`
      }
      if (id === RESOLVED_USER_CSS) {
        const cssPath = (config as { css?: string } | null)?.css
        if (!cssPath) return `export const css = '';`
        const abs = resolve(options.root, cssPath)
        try {
          const src = await readFile(abs, 'utf-8')
          return `export const css = ${JSON.stringify(src)};`
        } catch {
          return `export const css = '';`
        }
      }
      return null
    },
  }
}
