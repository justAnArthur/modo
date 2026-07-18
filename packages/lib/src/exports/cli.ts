#!/usr/bin/env node
// phase 3: the `modo` CLI. `init` / `dev` / `build` / `add` / `check`.
// reads `modo.config.ts` from cwd and runs the lib's internal vite/vike/validators.

import { createServer } from 'vite'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { readFile } from 'node:fs/promises'
import * as esbuild from 'esbuild'
import { spawn } from 'node:child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))
const here = resolve(__dirname, '..')                            // .../packages/lib
const exportsRoot = resolve(here, 'src', 'exports')
const runtimeRoot = resolve(here, 'src', 'runtime')

interface ModoConfig {
  name: string
  description?: string
  tokens?: { source: string }
  source?: { primitives: string; components: string; blocks: string }
  css?: string
  theme?: { defaultDensity?: string; defaultTheme?: string }
}

async function readModoConfig(cwd: string): Promise<ModoConfig> {
  const candidates = ['modo.config.ts', 'modo.config.tsx', 'modo.config.js', 'modo.config.mjs']
  let lastErr: unknown = null
  for (const name of candidates) {
    const p = resolve(cwd, name)
    try {
      const result = await esbuild.build({
        entryPoints: [p],
        bundle: true,
        format: 'esm',
        write: false,
        platform: 'node',
        target: 'node20',
        external: ['vite', 'vike', 'vike-react', 'react', 'react-dom'],
        alias: { 'modo-atomic-ui': exportsRoot },
        logLevel: 'silent',
      })
      const code = result.outputFiles?.[0]?.text
      if (!code) {
        lastErr = new Error('esbuild produced no output')
        continue
      }
      const tmp = resolve(here, '.modo-config-tmp.mjs')
      const fs = await import('node:fs/promises')
      await fs.writeFile(tmp, code)
      const mod = await import(tmp + '?t=' + Date.now())
      const cfg = (mod as { default: ModoConfig }).default
      await fs.unlink(tmp).catch(() => {})
      if (cfg && typeof cfg === 'object') return cfg
      lastErr = new Error(`default export in ${name} is not an object`)
    } catch (e) {
      lastErr = e
      // eslint-disable-next-line no-console
      console.error(`[modo] ${p}: ${(e as Error).message}`)
    }
  }
  throw new Error(`failed to read modo.config from ${cwd}: ${(lastErr as Error)?.message ?? 'not found'}`)
}

async function dev(cwd: string) {
  const config = await readModoConfig(cwd)
  if (!config.source) throw new Error('modo.config.ts must include `source: { primitives, components, blocks }`')

  const port = Number(process.env.PORT ?? 5173)

  // pass the demo root to the lib's vite config via env var.
  // vike requires vite's `root` to match `process.cwd()`, so chdir to the lib's runtime.
  process.env.MODO_DEMO_ROOT = cwd
  const previousCwd = process.cwd()
  process.chdir(runtimeRoot)
  try {
    const server = await createServer({
      root: runtimeRoot,
      server: {
        host: '127.0.0.1',
        port,
        strictPort: true,
        fs: {
          allow: [here, cwd, resolve(here, '..', '..')],
        },
      },
      appType: 'custom',
    })
    await server.listen()
    server.printUrls()
    process.on('exit', () => {
      try { process.chdir(previousCwd) } catch { /* noop */ }
    })
  } catch (e) {
    process.chdir(previousCwd)
    throw e
  }
}

function help() {
  console.log(`modo-atomic-ui — atomic design system renderer

Usage:
  modo dev              start the dev server (reads modo.config.ts from cwd)
  modo build            pre-render the site to ./dist/client (static, deployable)
  modo check            validate modo.config.ts + token files against the schema
  modo init <name>      scaffold a new design system project in ./<name>
  modo add <kind> <name>   scaffold primitives|components|blocks|tokens/<name>
  modo --help           show this help
`)
}

async function build(cwd: string) {
  const config = await readModoConfig(cwd)
  if (!config.source) throw new Error('modo.config.ts must include `source: { primitives, components, blocks }`')

  // hand off to vike build (lib-relative). vike requires `root` to match cwd,
  // so we spawn the binary in the lib's runtime/ dir. then move the output
  // to the user's project.
  const previousCwd = process.cwd()
  process.chdir(runtimeRoot)
  try {
    await new Promise<void>((resolveP, rejectP) => {
      const child = spawn(
        process.execPath,
        [resolve(here, 'node_modules', 'vike', 'bin.js'), 'build', '--root', '.'],
        { stdio: 'inherit', env: { ...process.env, MODO_DEMO_ROOT: cwd } }
      )
      child.on('exit', (code) => (code === 0 ? resolveP() : rejectP(new Error(`vike build exited with code ${code}`))))
      child.on('error', rejectP)
    })
  } finally {
    process.chdir(previousCwd)
  }

  // move dist/ to the user's project root.
  const fs = await import('node:fs/promises')
  const srcDist = resolve(runtimeRoot, 'dist')
  const dstDist = resolve(cwd, 'dist')
  await fs.rm(dstDist, { recursive: true, force: true })
  await fs.rename(srcDist, dstDist)
  // eslint-disable-next-line no-console
  console.log(`[modo] → ${dstDist}`)
}

async function main() {
  const argv = process.argv.slice(2)
  const cmd = argv[0]
  if (!cmd || cmd === '--help' || cmd === '-h') {
    help()
    return
  }
  const cwd = process.cwd()
  switch (cmd) {
    case 'dev':
      await dev(cwd)
      break
    case 'build':
      await build(cwd)
      break
    default:
      console.error(`unknown command: ${cmd}`)
      help()
      process.exit(1)
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
