import { defineConfig } from 'bunup'

const shared = {
  format: 'esm',
  dts: { inferTypes: true },
  sourceBase: '.',
  preferredTsconfig: './tsconfig.build.json',
  packages: 'external',
  clean: false,
} as const

// Two builds: the components run in the browser, the UnoCSS preset in the
// host's Node config. The `build` script clears dist/ first.
export default defineConfig([
  {
    ...shared,
    name: 'components',
    entry: ['index.ts', '{primitives,components,blocks}/**/index.tsx'],
    target: 'browser',
    jsx: { runtime: 'automatic', importSource: 'react', development: false },
  },
  { ...shared, name: 'preset', entry: ['preset.ts'], target: 'node' },
])
