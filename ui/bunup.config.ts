import { defineConfig } from 'bunup'

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

// the components run in the browser, the UnoCSS preset in the host's Node config
export default defineConfig([
  {
    ...shared,
    name: 'components',
    // lib/* in the same build: splitting keeps one instance of each context
    // for the items and for hosts importing `@justanarthur/modo-ui/lib/*`
    entry: ['index.ts', '{primitives,components,blocks}/**/index.tsx', 'lib/*.{ts,tsx}'],
    // scripts/use-client.ts adds `"use client"` to the modules that need it
    target: 'browser',
  },
  { ...shared, name: 'preset', entry: ['preset.ts'], target: 'node' },
])
