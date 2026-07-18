// exposes user-provided components to the lib chrome as a virtual module.
// `modo.config.ts` can map slot names to user component paths, e.g.
//   components: { Select: './components/my-select', Link: './components/my-link' }
// missing slots resolve to null; the lib's +Layout.tsx falls back to native.

import type { Plugin } from 'vite'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import * as esbuild from 'esbuild'

export interface ComponentsPluginOptions {
  root: string  // the user's project root
}

const SLOTS = ['Select', 'Link', 'Button'] as const
type Slot = (typeof SLOTS)[number]

async function readConfig(root: string): Promise<Record<string, string> | null> {
  const candidates = ['modo.config.ts', 'modo.config.tsx']
  for (const name of candidates) {
    const p = resolve(root, name)
    try {
      // bundle the config file with a stub for `modo-atomic-ui/config` so
      // we can evaluate the default export without runtime resolution.
      const stub = `export const defineConfig = (c) => c\nexport {}\n`
      const tmpStub = resolve(process.cwd(), `.modo-cfg-stub-${Date.now()}.mjs`)
      await import('node:fs/promises').then((fs) => fs.writeFile(tmpStub, stub))
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
        const tmp = resolve(process.cwd(), `.modo-cfg-out-${Date.now()}.mjs`)
        await import('node:fs/promises').then((fs) => fs.writeFile(tmp, code))
        try {
          const mod = await import(tmp)
          return ((mod as { default?: Record<string, unknown> }).default?.components as Record<string, string>) ?? null
        } finally {
          await import('node:fs/promises').then((fs) => fs.unlink(tmp).catch(() => {}))
        }
      } finally {
        await import('node:fs/promises').then((fs) => fs.unlink(tmpStub).catch(() => {}))
      }
    } catch {
      // try next candidate
    }
  }
  return null
}

function resolveSlot(componentPath: string, root: string): string {
  const abs = resolve(root, componentPath)
  // strip a known extension so callers can use either
  //   './components/select' (directory; esbuild will find index.tsx)
  //   './components/select/index.tsx'
  return abs.replace(/\.(tsx|ts|jsx|js)$/, '')
}

async function pickExisting(candidates: string[], fs: typeof import('node:fs/promises')): Promise<string | null> {
  for (const c of candidates) {
    try {
      const stat = await fs.stat(c)
      if (stat.isFile()) return c
    } catch { /* keep looking */ }
  }
  return null
}

export function componentsPlugin(opts: ComponentsPluginOptions): Plugin {
  return {
    name: 'modo-components',
    async resolveId(id) {
      if (id === 'virtual:modo-components') return '\0virtual:modo-components'
      return null
    },
    async load(id) {
      if (id !== '\0virtual:modo-components') return null
      const map = (await readConfig(opts.root)) ?? {}
      // we pre-resolve each slot using esbuild so the user's component
      // becomes a static import in this virtual module. that keeps the
      // build synchronous and lets the consumer treat slots as plain
      // values rather than Promises.
      const imports: string[] = []
      const bindings: string[] = []
      let i = 0
      for (const slot of SLOTS) {
        const p = map[slot]
        if (!p) {
          bindings.push(`export const ${slot} = null;`)
          continue
        }
        const abs = resolveSlot(p, opts.root)
        // bundle the user's component into a temp .mjs we can import statically.
        // this is one-time at config-load. entry resolution: try a .ts/.tsx file
        // first, fall back to a directory (which esbuild treats as index.tsx).
        const candidates = [
          abs,
          `${abs}.tsx`,
          `${abs}.ts`,
          `${abs}.jsx`,
          `${abs}.js`,
          resolve(abs, 'index.tsx'),
          resolve(abs, 'index.ts'),
        ]
        const fs = await import('node:fs/promises')
        const entry = await pickExisting(candidates, fs)
        if (!entry) {
          bindings.push(`export const ${slot} = null;`)
          continue
        }
        const result = await esbuild.build({
          entryPoints: [entry],
          bundle: true,
          write: false,
          format: 'esm',
          platform: 'neutral',
          jsx: 'automatic',
          loader: { '.tsx': 'tsx', '.ts': 'ts', '.jsx': 'jsx', '.js': 'js' },
          external: ['react', 'react-dom', 'react/jsx-runtime'],
          logLevel: 'silent',
        })
        const code = result.outputFiles?.[0]?.text
        if (!code) {
          bindings.push(`export const ${slot} = null;`)
          continue
        }
        const tmp = resolve(process.cwd(), `.modo-cmp-${slot}-${Date.now()}-${i++}.mjs`)
        await fs.writeFile(tmp, code)
        imports.push(`import * as __ns_${slot} from '${tmp}';`)
        // default export OR named export matching the slot
        bindings.push(`export const ${slot} = __ns_${slot}.default ?? __ns_${slot}['${slot}'] ?? null;`)
      }
      return [...imports, ...bindings].join('\n')
    },
  }
}
