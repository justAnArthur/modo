import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import vike from 'vike/plugin'
import { tokensPlugin } from './plugins/tokens'
import { sourcePlugin } from './plugins/source'
import { componentsPlugin } from './plugins/components'
import { userCssPlugin } from './plugins/user-css'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const exportsRoot = resolve(__dirname, '../exports')
const defaultDemoRoot = resolve(__dirname, '../../demo')
// the user's project root is passed via MODO_DEMO_ROOT (set by the modo
// CLI before spawning vite). when invoked directly from the lib
// (`cd src/runtime && vite`), the default demo root is used.
const demoRoot = process.env.MODO_DEMO_ROOT ?? defaultDemoRoot

export default defineConfig({
  plugins: [
    react(),
    vike(),
    tokensPlugin({ root: demoRoot }),
    sourcePlugin({ root: demoRoot }),
    componentsPlugin({ root: demoRoot }),
    userCssPlugin({ root: demoRoot }),
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
})
