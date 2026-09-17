import { existsSync, mkdirSync, rmSync, statSync } from 'node:fs'
import { resolve, join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { randomUUID } from 'node:crypto'
import esbuild from 'esbuild'
import { siteConfigSchema, type SiteConfig } from './schema'

const cacheDir = resolve(process.cwd(), '.modo-tmp')

// vite.config.ts, configPlugin and shellPlugin all ask for the same config
// during startup; cache by path + mtime so it is only bundled once per change.
const cache = new Map<string, { mtime: number; config: SiteConfig }>()

function ensureCacheDir() {
  mkdirSync(cacheDir, { recursive: true })
}

export async function loadModoConfig(configPath: string): Promise<SiteConfig> {
  if (!existsSync(configPath)) {
    throw new Error(
      `modo config not found at ${configPath}.\nRun \`modo init <name>\` to scaffold a project.`,
    )
  }
  const mtime = statSync(configPath).mtimeMs
  const hit = cache.get(configPath)
  if (hit && hit.mtime === mtime) return hit.config
  ensureCacheDir()
  const outFile = join(cacheDir, `modo-config-${randomUUID()}.mjs`)
  try {
    await esbuild.build({
      entryPoints: [configPath],
      bundle: true,
      format: 'esm',
      outfile: outFile,
      platform: 'node',
      target: 'es2022',
      external: ['react', 'react-dom', 'react/jsx-runtime', 'modo', 'modo/config'],
      loader: { '.ts': 'ts', '.tsx': 'tsx', '.css': 'empty' },
    })
    let mod: { default?: unknown }
    try {
      mod = (await import(pathToFileURL(outFile).href)) as { default?: unknown }
    } catch (err) {
      const msg = (err as Error).message ?? String(err)
      if (msg.includes('Cannot find module') && msg.includes('modo')) {
        throw new Error(
          `Cannot resolve "modo" while loading modo.config.ts.\nMake sure dependencies are installed (run \`bun install\` or \`npm install\`).`,
        )
      }
      throw err
    }
    const config = siteConfigSchema.parse(mod.default ?? mod)
    cache.set(configPath, { mtime, config })
    return config
  } finally {
    if (existsSync(outFile)) {
      try {
        rmSync(outFile)
      } catch {
        // best-effort
      }
    }
  }
}

export function getModoConfigPath(userRoot: string): string {
  return resolve(userRoot, 'modo.config.ts')
}
