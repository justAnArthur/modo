import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import react from '@vitejs/plugin-react'
import { searchForWorkspaceRoot, type UserConfig } from 'vite'
import { createBundler } from '../plugins/bundle'
import { configPlugin } from '../plugins/config'
import { itemsPlugin } from '../plugins/items'
import { shellPlugin } from '../plugins/shell'
import { tokensPlugin } from '../plugins/tokens'
import { loadModoConfig } from './config-loader'
import { itemsRootOf } from './discover'
import { resolveUserFile } from './resolve-ref'

export interface ViteConfigOptions {
  /** The package root of the lib: the runtime and the plain fallbacks live under it. */
  libDir: string
  /** The design system's root. */
  userRoot: string
  configPath: string
}

type ViteExtension = (config: UserConfig) => UserConfig | Promise<UserConfig>

/** modo's whole Vite config for a design system, with its `vite` extension applied. Pass it with `configFile: false`. */
export async function createViteConfig({ libDir, userRoot, configPath }: ViteConfigOptions): Promise<UserConfig> {
  // configPlugin reports config errors with full detail once Vite starts.
  const site = await loadModoConfig(configPath).catch(() => null)
  const bundler = createBundler({ userRoot, configPath })
  const itemsRoot = itemsRootOf(userRoot, site)
  const config: UserConfig = {
    root: resolve(libDir, 'src', 'runtime'),
    base: site?.base,
    plugins: [
      configPlugin({ userRoot, configPath }),
      tokensPlugin({ userRoot, configPath }),
      itemsPlugin({ userRoot, itemsRoot, bundler }),
      shellPlugin({ libDir, bundler }),
      react(),
    ],
    server: {
      host: 'localhost',
      port: 5173,
      strictPort: true,
      // Build output is rewritten on every rebuild; the items plugin reloads
      // on *source* changes and invalidates the outputs itself.
      watch: { ignored: ['**/.modo-tmp/**'] },
      fs: {
        // The workspace root: Bun hoists deps into the monorepo's node_modules
        // store, and Vite 403s font URLs resolved there without it. The
        // config's `root` too, which may sit outside the project.
        allow: [searchForWorkspaceRoot(userRoot), itemsRoot, libDir],
      },
    },
    // Item bundles import React from the design system, the runtime from the
    // lib; one copy, or hooks break across them.
    resolve: { dedupe: ['react', 'react-dom'] },
    optimizeDeps: {
      include: ['react', 'react-dom', 'react-dom/client', 'marked'],
    },
    build: {
      outDir: resolve(userRoot, 'dist'),
      emptyOutDir: true,
      // Babel standalone (inline `@example` compiling) is one lazy ~3 MB chunk by design.
      chunkSizeWarningLimit: 3200,
    },
  }
  return site?.vite ? extend(config, userRoot, site.vite) : config
}

// Imported natively, never bundled: plugins with native binaries (@tailwindcss/vite) break when bundled.
async function extend(config: UserConfig, userRoot: string, ref: string): Promise<UserConfig> {
  const file = resolveUserFile(userRoot, ref)
  if (!file) throw new Error(`modo: vite extension "${ref}" not found (resolved from ${userRoot})`)
  const mod = (await import(pathToFileURL(file).href)) as { default?: unknown }
  if (typeof mod.default !== 'function')
    throw new Error(`modo: vite extension at ${ref} must default-export a function`)
  return (await (mod.default as ViteExtension)(config)) ?? config
}
