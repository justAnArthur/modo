import { randomUUID } from 'node:crypto'
import { existsSync, mkdirSync, rmSync, statSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import esbuild from 'esbuild'
import { type SiteConfig, siteConfigSchema } from './schema'

const cacheDir = resolve(process.cwd(), '.modo-tmp')

// vite.config.ts, configPlugin and shellPlugin all ask for the same config
// during startup; cache it until any bundled input changes (not just the entry:
// the demo runner's entry is a wrapper re-exporting the real modo.config.ts).
const cache = new Map<string, { inputs: string[]; stamp: string; config: SiteConfig }>()

function stampOf(files: string[]): string {
  return files.map(f => (existsSync(f) ? statSync(f).mtimeMs : 0)).join(':')
}

function ensureCacheDir() {
  mkdirSync(cacheDir, { recursive: true })
}

export async function loadModoConfig(configPath: string): Promise<SiteConfig> {
  if (!existsSync(configPath)) {
    throw new Error(`modo config not found at ${configPath}.\nRun \`modo init <name>\` to scaffold a project.`)
  }
  const hit = cache.get(configPath)
  if (hit && hit.stamp === stampOf(hit.inputs)) return hit.config
  ensureCacheDir()
  const outFile = join(cacheDir, `modo-config-${randomUUID()}.mjs`)
  try {
    // Metafile input paths are relative to absWorkingDir; pin it rather than
    // trust the process cwd (the CLI chdirs to the runtime after esbuild starts).
    const workDir = dirname(configPath)
    const { metafile } = await esbuild.build({
      entryPoints: [configPath],
      absWorkingDir: workDir,
      metafile: true,
      bundle: true,
      format: 'esm',
      outfile: outFile,
      platform: 'node',
      target: 'es2022',
      external: ['react', 'react-dom', 'react/jsx-runtime', '@justanarthur/modo', '@justanarthur/modo/config'],
      loader: { '.ts': 'ts', '.tsx': 'tsx', '.css': 'empty' },
    })
    let mod: { default?: unknown }
    try {
      mod = (await import(pathToFileURL(outFile).href)) as { default?: unknown }
    } catch (err) {
      const msg = (err as Error).message ?? String(err)
      if (msg.includes('Cannot find module') && msg.includes('@justanarthur/modo')) {
        throw new Error(
          `Cannot resolve "@justanarthur/modo" while loading modo.config.ts.\nMake sure dependencies are installed (run \`bun install\` or \`npm install\`).`,
        )
      }
      throw err
    }
    const config = siteConfigSchema.parse(mod.default ?? mod)
    const inputs = Object.keys(metafile.inputs).map(p => resolve(workDir, p))
    cache.set(configPath, { inputs, stamp: stampOf(inputs), config })
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
