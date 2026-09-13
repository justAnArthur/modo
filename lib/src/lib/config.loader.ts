import { existsSync, mkdirSync, rmSync } from 'node:fs'
import { resolve, join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { randomUUID } from 'node:crypto'
import esbuild from 'esbuild'
import { siteConfigSchema, type SiteConfig } from './schema'

const cacheDir = resolve(process.cwd(), '.modo-tmp')

function ensureCacheDir() {
  mkdirSync(cacheDir, { recursive: true })
}

export async function loadModoConfig(userRoot: string): Promise<SiteConfig> {
  const configPath = resolve(userRoot, 'modo.config.ts')
  if (!existsSync(configPath)) {
    throw new Error(
      `modo.config.ts not found in ${userRoot}.\nRun \`modo init <name>\` to scaffold a project.`,
    )
  }
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
      external: ['react', 'react-dom', 'react/jsx-runtime', 'modo-atomic-ui', 'modo-atomic-ui/config'],
      loader: { '.ts': 'ts', '.tsx': 'tsx', '.css': 'empty' },
    })
    let mod: { default?: unknown }
    try {
      mod = (await import(pathToFileURL(outFile).href)) as { default?: unknown }
    } catch (err) {
      const msg = (err as Error).message ?? String(err)
      if (msg.includes('Cannot find module') && msg.includes('modo-atomic-ui')) {
        throw new Error(
          `Cannot resolve "modo-atomic-ui" while loading modo.config.ts.\nMake sure dependencies are installed (run \`bun install\` or \`npm install\`).`,
        )
      }
      throw err
    }
    return siteConfigSchema.parse(mod.default ?? mod)
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
