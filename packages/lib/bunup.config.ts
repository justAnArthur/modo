import { defineConfig, type DefineConfigItem } from 'bunup'
import { exports } from 'bunup/plugins'

// mirrors ~/Projects/utegsk/payload-www/plugins/translate/bunup.config.ts verbatim
// builds `dist/` from `src/exports/*` for npm publish.
export default defineConfig({
  entry: [
    'src/exports/*',
  ],
  format: ['esm'],
  clean: true,
  dts: { inferTypes: true },
  sourceBase: './src/exports',
  jsx: {
    runtime: 'automatic',
    importSource: 'react',
    development: false,
  },
  // keep these as runtime requires — they have native bindings or are too heavy
  // to bundle (esbuild's native binary, vite's plugin runner, the vike runtime).
  external: [
    'esbuild',
    'vite',
    'vike',
    'vike-react',
    '@vitejs/plugin-react',
    'react',
    'react-dom',
    'zod',
  ],
  plugins: [
    exports({}),
  ],
}) as DefineConfigItem
