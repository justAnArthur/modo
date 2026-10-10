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
    entry: ['index.ts', '{primitives,components,blocks}/**/index.tsx'],
    target: 'browser',
  },
  { ...shared, name: 'preset', entry: ['preset.ts'], target: 'node' },
])
