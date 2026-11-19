import { readFileSync, writeFileSync } from 'node:fs'
import { type BunupPlugin, defineConfig } from 'bunup'

// package.json's `sideEffects` lists the TS sources as well as the CSS: Bun
// applies the field to the package it is bundling, and without the sources
// listed it drops the barrel's re-exported bindings (index.js then exports
// names it never declares). Consumers bundle dist/*.js, which stays
// side-effect free for them.
const shared = {
  format: 'esm',
  // Split: shared declarations land in shared chunks; unsplit, bunup drops the barrel's index.d.ts.
  dts: { inferTypes: true, splitting: true },
  sourceBase: '.',
  preferredTsconfig: './tsconfig.build.json',
  // modo-ui, react and the rest stay imports: modo-ui is a peer, so the host's copy (and its contexts) is the one in use
  packages: 'external',
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

// Every lib module is an entry, so each lands in a chunk of its own: the
// directive then marks exactly the client modules, and one chunk holds the
// kit's icon context for the barrel and every subpath.
export default defineConfig({
  ...shared,
  entry: ['index.ts', '{components,blocks}/**/index.tsx', 'lib/*.{ts,tsx}'],
  target: 'browser',
  plugins: [useClient],
})
