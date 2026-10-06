import { randomUUID } from 'node:crypto'
import { existsSync, mkdirSync, rmSync, statSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import esbuild from 'esbuild'
import { type SiteConfig, siteConfigSchema } from './schema'

// vite.config.ts, configPlugin and the bundler all ask for the same config
// during startup; cache it until any bundled input changes (not just the entry:
// the demo runner's entry is a wrapper re-exporting the real modo.config.ts).
const cache = new Map<string, { inputs: string[]; stamp: string; config: SiteConfig }>()

function stampOf(files: string[]): string {
  return files.map(f => (existsSync(f) ? statSync(f).mtimeMs : 0)).join(':')
}

export async function loadModoConfig(configPath: string): Promise<SiteConfig> {
  if (!existsSync(configPath)) {
    throw new Error(`modo config not found at ${configPath}.\nRun \`modo init <name>\` to scaffold a project.`)
  }
  const hit = cache.get(configPath)
  if (hit && hit.stamp === stampOf(hit.inputs)) return hit.config
  // Next to the config, never the process cwd: the CLI chdirs into the lib's
  // runtime before Vite loads this module again.
  const workDir = dirname(configPath)
  const tmpDir = join(workDir, '.modo-tmp')
  mkdirSync(tmpDir, { recursive: true })
  const outFile = join(tmpDir, `modo-config-${randomUUID()}.mjs`)
  try {
    // Metafile input paths are relative to absWorkingDir.
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
      // Node says "Cannot find package", Bun "Cannot find module".
      if (/Cannot find (module|package) ['"]@justanarthur\/modo/.test(String(err))) {
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
    rmSync(outFile, { force: true })
  }
}
