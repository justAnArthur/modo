import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig, searchForWorkspaceRoot, type UserConfig } from 'vite'
import { loadModoConfig } from '../lib/config.loader'
import { createBundler } from '../plugins/bundle'
import { configPlugin } from '../plugins/config'
import { itemsPlugin } from '../plugins/items'
import { shellPlugin } from '../plugins/shell'
import { tokensPlugin } from '../plugins/tokens'

// The CLI sets MODO_USER_ROOT and MODO_CONFIG_PATH, chdirs into this runtime
// dir and runs Vite in-process. LIB_DIR is the package root.
const RUNTIME_DIR = resolve(import.meta.dirname)
const LIB_DIR = resolve(RUNTIME_DIR, '..', '..')
const USER_ROOT = process.env.MODO_USER_ROOT ?? process.cwd()
const CONFIG_PATH = process.env.MODO_CONFIG_PATH ?? resolve(USER_ROOT, 'modo.config.ts')
const PORT = Number(process.env.MODO_PORT ?? 5173)

type ViteExtension = (config: UserConfig) => UserConfig | Promise<UserConfig>

// Applies the user's `vite: './vite.ts'` extension from modo.config.ts, if any.
// The extension module is imported natively (never esbuild-bundled) so plugins
// with native binaries like @tailwindcss/vite work unchanged.
async function applyUserViteExtension(base: UserConfig): Promise<UserConfig> {
  // configPlugin reports config errors with full detail once Vite starts.
  const cfg = await loadModoConfig(CONFIG_PATH).catch(() => null)
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
  // One esbuild build shared by the items and shell plugins (see plugins/bundle.ts).
  const bundler = createBundler({ userRoot: USER_ROOT, configPath: CONFIG_PATH })
  const base: UserConfig = {
    root: RUNTIME_DIR,
    plugins: [
      configPlugin({ userRoot: USER_ROOT, configPath: CONFIG_PATH }),
      tokensPlugin({ userRoot: USER_ROOT }),
      itemsPlugin({ userRoot: USER_ROOT, bundler }),
      shellPlugin({ libDir: LIB_DIR, bundler }),
      react(),
    ],
    server: {
      host: '127.0.0.1',
      port: PORT,
      strictPort: true,
      // Build output is rewritten on every rebuild; the items plugin reloads
      // on *source* changes and invalidates the outputs itself.
      watch: { ignored: ['**/.modo-tmp/**'] },
      fs: {
        // The workspace root: Bun hoists deps into the monorepo's node_modules
        // store, and Vite 403s font URLs resolved there without it.
        allow: [searchForWorkspaceRoot(USER_ROOT), LIB_DIR],
      },
    },
    // Item bundles import React from the design system, the runtime from the
    // lib; one copy, or hooks break across them.
    resolve: { dedupe: ['react', 'react-dom'] },
    optimizeDeps: {
      include: ['react', 'react-dom', 'react-dom/client', 'marked'],
    },
    build: {
      outDir: resolve(USER_ROOT, 'dist'),
      emptyOutDir: true,
    },
  }
  return applyUserViteExtension(base)
})
