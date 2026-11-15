import { readFileSync, writeFileSync } from 'node:fs'
import { type BunupPlugin, defineConfig } from 'bunup'

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

// the components run in the browser, the UnoCSS preset in the host's Node config
export default defineConfig([
  {
    ...shared,
    name: 'components',
    entry: ['index.ts', '{primitives,components,blocks}/**/index.tsx'],
    target: 'browser',
    plugins: [useClient],
  },
  { ...shared, name: 'preset', entry: ['preset.ts'], target: 'node' },
])
