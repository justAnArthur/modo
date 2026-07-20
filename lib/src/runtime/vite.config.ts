import { defineConfig, mergeConfig, type UserConfig } from 'vite'
import react from '@vitejs/plugin-react'
import vike from 'vike/plugin'
import { tokensPlugin } from './plugins/tokens'
import { sourcePlugin } from './plugins/source'
import { userCssPlugin } from './plugins/user-css'
import { elevatedPlugin } from './plugins/elevated'
import { loadModoConfig } from '../lib/config.loader'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const exportsRoot = resolve(__dirname, '../exports')
const defaultDemoRoot = resolve(__dirname, '../../../demo')
// the user's project root is passed via MODO_DEMO_ROOT (set by the modo
// CLI before spawning vite). when invoked directly from the lib
// (`cd src/runtime && vite`), the default demo root is used.
const demoRoot = process.env.MODO_DEMO_ROOT ?? defaultDemoRoot

// opt-in: if the user adds a `vite` field to their modo.config.ts, merge
// it into the base config. this lets them drop in vite plugins (e.g.
// @tailwindcss/vite) without the lib baking them in. the field is
// validated as `unknown` by the lib; structural validation happens at
// vite's config-load time.
async function loadUserVite(): Promise<UserConfig | null> {
  const userConfig = await loadModoConfig(demoRoot).catch(() => null)
  if (!userConfig || typeof userConfig !== 'object') return null
  const vite = (userConfig as { vite?: unknown }).vite
  if (!vite || typeof vite !== 'object') return null
  return vite as UserConfig
}

const baseConfig: UserConfig = {
  plugins: [
    react(),
    vike(),
    tokensPlugin({ root: demoRoot }),
    sourcePlugin({ root: demoRoot }),
    userCssPlugin({ root: demoRoot }),
    elevatedPlugin({ root: demoRoot }),
  ],
  resolve: {
    alias: [
      { find: /^modo-atomic-ui\/(.+)$/, replacement: `${exportsRoot}/$1` },
      { find: 'modo-atomic-ui', replacement: exportsRoot },
      { find: 'modo.panel', replacement: `${demoRoot}/modo.panel` },
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
      allow: [
        resolve(__dirname, '../..'),
        resolve(__dirname, '../../..'),
        // source plugin writes per-item esbuild bundles here so external
        // imports (e.g. the user's admin/components/elevated.tsx) emit
        // short relative paths Vite can resolve. see _helpers.ts.
        resolve(demoRoot, '.modo-tmp'),
      ],
    },
  },
}

export default defineConfig(async () => {
  const userVite = await loadUserVite()
  return userVite ? mergeConfig(baseConfig, userVite) : baseConfig
})
