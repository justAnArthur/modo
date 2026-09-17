import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { defineConfig, type UserConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { configPlugin } from '../plugins/config'
import { tokensPlugin } from '../plugins/tokens'
import { itemsPlugin } from '../plugins/items'
import { shellPlugin } from '../plugins/shell'
import { loadModoConfig } from '../lib/config.loader'

// The CLI sets MODO_USER_ROOT before spawning Vite and chdirs to the runtime
// dir. The runtime dir is the location of this file; LIB_DIR is its parent.
const RUNTIME_DIR = resolve(import.meta.dirname)
const LIB_DIR = resolve(RUNTIME_DIR, '..', '..')
const USER_ROOT = process.env.MODO_USER_ROOT ?? process.cwd()

type ViteExtension = (config: UserConfig) => UserConfig | Promise<UserConfig>

// Applies the user's `vite: './vite.ts'` extension from modo.config.ts, if any.
// The extension module is imported natively (never esbuild-bundled) so plugins
// with native binaries like @tailwindcss/vite work unchanged.
async function applyUserViteExtension(base: UserConfig): Promise<UserConfig> {
  const configPath = process.env.MODO_CONFIG_PATH ?? resolve(USER_ROOT, 'modo.config.ts')
  // configPlugin reports config errors with full detail once Vite starts.
  const cfg = await loadModoConfig(configPath).catch(() => null)
  if (!cfg?.vite) return base

  const extPath = resolve(USER_ROOT, cfg.vite)
  const mod = (await import(pathToFileURL(extPath).href)) as { default?: unknown }
  if (typeof mod.default !== 'function') {
    throw new Error(`modo: vite extension at ${cfg.vite} must default-export a function`)
  }
  const extended = await (mod.default as ViteExtension)(base)
  return extended ?? base
}

export default defineConfig(async () => {
  const base: UserConfig = {
    root: RUNTIME_DIR,
    plugins: [
      configPlugin({ userRoot: USER_ROOT }),
      tokensPlugin({ userRoot: USER_ROOT }),
      itemsPlugin({ userRoot: USER_ROOT }),
      shellPlugin({ userRoot: USER_ROOT, libDir: LIB_DIR }),
      react(),
    ],
    server: {
      host: '127.0.0.1',
      port: Number(process.env.MODO_PORT) || 5173,
      strictPort: true,
      fs: {
        allow: [RUNTIME_DIR, LIB_DIR, USER_ROOT, resolve(USER_ROOT, '.modo-tmp')],
      },
    },
    optimizeDeps: {
      include: ['react', 'react-dom', 'react-dom/client'],
    },
    build: {
      outDir: resolve(RUNTIME_DIR, 'dist'),
      emptyOutDir: true,
    },
  }
  return applyUserViteExtension(base)
})
