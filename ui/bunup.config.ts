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
    // `variants.ts` beside an item holds its server-callable class helpers: an
    // entry of its own, so it lands in a module without `"use client"`
    entry: [
      'index.ts',
      '{primitives,components,blocks}/**/index.tsx',
      '{components,blocks}/**/variants.ts',
      'lib/*.{ts,tsx}',
    ],
    // scripts/use-client.ts adds `"use client"` to the modules that need it
    target: 'browser',
  },
  { ...shared, name: 'preset', entry: ['preset.ts'], target: 'node' },
])
