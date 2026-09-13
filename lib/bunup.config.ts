import { defineConfig } from 'bunup'

export default defineConfig({
  entry: ['src/exports/*'],
  format: ['esm'],
  clean: true,
  dts: { inferTypes: true },
  sourceBase: './src/exports',
  jsx: {
    runtime: 'automatic',
    importSource: 'react',
    development: false,
  },
  external: ['esbuild', 'vite', 'react', 'react-dom', 'zod', '@vitejs/plugin-react'],
  onSuccess: 'chmod +x dist/cli.js',
})
