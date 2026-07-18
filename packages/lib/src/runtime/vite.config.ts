import { defineConfig, type UserConfig } from 'vite'
import react from '@vitejs/plugin-react'
import vike from 'vike/plugin'
import { tokensPlugin } from './plugins/tokens'
import { sourcePlugin } from './plugins/source'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const exportsRoot = resolve(__dirname, '../exports')
const defaultDemoRoot = resolve(__dirname, '../../../demo')

// vite config is a function so the CLI can pass the user's project root.
// when invoked directly (`cd src/runtime && vite`), the default is used.
export default defineConfig((env): UserConfig => {
  const demoRoot = process.env.MODO_DEMO_ROOT ?? defaultDemoRoot
  return {
    plugins: [
      react(),
      vike(),
      tokensPlugin({ root: demoRoot }),
      sourcePlugin({ root: demoRoot }),
    ],
    resolve: {
      alias: [
        { find: /^modo-atomic-ui\/(.+)$/, replacement: `${exportsRoot}/$1` },
        { find: 'modo-atomic-ui', replacement: exportsRoot },
        { find: /^@demo\/(.+)$/, replacement: `${demoRoot}/$1` },
        { find: '@demo', replacement: demoRoot },
      ],
    },
    server: {
      host: '127.0.0.1',
      port: 5173,
      strictPort: true,
      fs: {
        // allow reading outside vite root — the user's DS lives outside
        allow: [resolve(__dirname, '../..'), resolve(__dirname, '../../..')],
      },
    },
  }
})
