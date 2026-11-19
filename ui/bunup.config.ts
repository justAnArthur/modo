import { readFileSync, writeFileSync } from 'node:fs'
import { type BunupPlugin, defineConfig } from 'bunup'

// package.json's `sideEffects` lists the TS sources as well as the CSS: Bun
// applies the field to the package it is bundling, and without the sources
// listed it drops the barrel's re-exported bindings (index.js then exports
// names it never declares). Consumers bundle dist/*.js, which stays
// side-effect free for them.
const shared = {
  format: 'esm',
  dts: { inferTypes: true },
  sourceBase: '.',
  preferredTsconfig: './tsconfig.build.json',
  // unocss is a devDependency: only its types reach preset.d.ts
  packages: 'external',
  // the `build` script clears dist/ once; per-build cleaning would wipe the other build
  clean: false,
} as const

// Bun keeps a module's 'use client' where the module lands in its chunk, below
// the hoisted imports, where it is no longer a directive. RSC hosts (Next.js)
// read it only as the file's first statement, so move it to the top of every
// output that holds one.
const DIRECTIVE = /^['"]use client['"];?\n/gm

const useClient: BunupPlugin = {
  name: 'use-client',
  hooks: {
    onBuildDone({ files }) {
      for (const { fullPath, dts } of files) {
        if (dts || !fullPath.endsWith('.js')) continue
        const code = readFileSync(fullPath, 'utf8')
        const stripped = code.replace(DIRECTIVE, '')
        if (stripped !== code) writeFileSync(fullPath, `"use client";\n${stripped}`)
      }
    },
  },
}

// the components run in the browser; the UnoCSS preset and docs/vite.ts (a modo
// `vite` extension) in the host's Node config, which never strips types under
// node_modules, so both ship as JS
export default defineConfig([
  {
    ...shared,
    name: 'components',
    // Every lib module and item `variants.ts` is an entry, so each lands in a
    // chunk of its own: the directive then marks exactly the client modules,
    // and one chunk holds each context for the barrel and every subpath.
    // docs/index.ts is the docs chrome (`./docs`), which the barrel never imports.
    entry: [
      'index.ts',
      '{primitives,components,blocks}/**/index.tsx',
      'components/**/variants.ts',
      'lib/*.{ts,tsx}',
      'docs/index.ts',
    ],
    target: 'browser',
    plugins: [useClient],
  },
  { ...shared, name: 'preset', entry: ['preset.ts', 'docs/vite.ts'], target: 'node' },
])
