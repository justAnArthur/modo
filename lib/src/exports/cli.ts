#!/usr/bin/env node
// phase 3: the `modo` CLI. `init` / `dev` / `build` / `add` / `check`.
// reads `modo.config.ts` from cwd and runs the lib's internal vite/vike/validators.

import { createServer } from 'vite'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { readFile } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import { runCheck } from './check.js'
import { loadModoConfig } from './modo-config.js'
import { toPascal } from './tsdoc.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const here = resolve(__dirname, '..')                            // .../<repo>/lib
const runtimeRoot = resolve(here, 'src', 'runtime')
const templatesRoot = resolve(here, 'templates', 'default')
const stubsRoot = resolve(here, 'templates', 'stubs')

type AddKind = 'primitive' | 'component' | 'block' | 'token'

const ADD_STUB: Record<AddKind, string> = {
  primitive: 'primitive.tsx',
  component: 'component.tsx',
  block: 'block.tsx',
  token: 'token.ts',
}

async function dev(cwd: string) {
  await loadModoConfig(cwd)  // validates that modo.config.ts exists + is valid

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
  await loadModoConfig(cwd)  // validates that modo.config.ts exists + is valid

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

async function getLibVersion(): Promise<string> {
  const pkg = JSON.parse(await readFile(resolve(here, 'package.json'), 'utf8')) as { version?: string }
  return pkg.version ?? '0.0.0'
}

async function init(cwd: string, name: string) {
  const fs = await import('node:fs/promises')
  const dst = resolve(cwd, name)
  if (await fs.stat(dst).catch(() => null)) {
    throw new Error(`destination already exists: ${dst}`)
  }
  if (!(await fs.stat(templatesRoot).catch(() => null))) {
    throw new Error(`template root missing: ${templatesRoot}`)
  }

  const version = await getLibVersion()
  const replacements: Record<string, string> = {
    __NAME__: name,
    __DESCRIPTION__: `design system scaffolded with modo-atomic-ui`,
    __MODO_VERSION__: `^${version}`,
  }

  await fs.cp(templatesRoot, dst, { recursive: true })
  await substitutePlaceholders(dst, replacements)

  // eslint-disable-next-line no-console
  console.log(`[modo] scaffolded ${dst}\n  next: cd ${name} && npm install && npm run dev`)
}

async function substitutePlaceholders(rootDir: string, replacements: Record<string, string>) {
  const fs = await import('node:fs/promises')
  const skipDirs = new Set(['node_modules', 'dist', '.git'])
  async function walk(dir: string): Promise<void> {
    const entries = await fs.readdir(dir, { withFileTypes: true })
    for (const entry of entries) {
      const p = resolve(dir, entry.name)
      if (entry.isDirectory()) {
        if (!skipDirs.has(entry.name)) await walk(p)
        continue
      }
      let text: string
      try {
        text = await fs.readFile(p, 'utf8')
      } catch {
        continue // binary, skip
      }
      let changed = false
      for (const [from, to] of Object.entries(replacements)) {
        if (text.includes(from)) {
          text = text.split(from).join(to)
          changed = true
        }
      }
      if (changed) await fs.writeFile(p, text)
    }
  }
  await walk(rootDir)
}

async function add(cwd: string, kind: string, name: string) {
  const fs = await import('node:fs/promises')
  if (!(kind in ADD_STUB)) {
    throw new Error(`unknown kind: ${kind} (expected: ${Object.keys(ADD_STUB).join(', ')})`)
  }
  const stubName = ADD_STUB[kind as AddKind]
  const stubPath = resolve(stubsRoot, stubName)
  if (!(await fs.stat(stubPath).catch(() => null))) {
    throw new Error(`missing stub: ${stubPath}`)
  }

  await loadModoConfig(cwd)  // validates config

  let target: string
  if (kind === 'token') {
    target = resolve(cwd, 'tokens', `${name}.ts`)
  } else {
    const tier = kind === 'primitive' ? 'primitives' : kind === 'component' ? 'components' : 'blocks'
    target = resolve(cwd, tier, name, 'index.tsx')
  }

  if (await fs.stat(target).catch(() => null)) {
    throw new Error(`destination already exists: ${target}`)
  }
  await fs.mkdir(resolve(target, '..'), { recursive: true })

  let text = await fs.readFile(stubPath, 'utf8')
  text = text.split('__NAME__').join(name)
  text = text.split('__NAME_PASCAL__').join(toPascal(name))
  await fs.writeFile(target, text)

  // eslint-disable-next-line no-console
  console.log(`[modo] added ${kind} ${name} → ${target}`)
}

async function check(cwd: string) {
  const { ok, issues } = await runCheck(cwd)
  if (ok) {
    // eslint-disable-next-line no-console
    console.log('[modo] check passed ✓')
    return
  }
  for (const i of issues) {
    // eslint-disable-next-line no-console
    console.error(`✗ ${i.file}\n  ${i.message}`)
  }
  // eslint-disable-next-line no-console
  console.error(`\n[modo] check failed: ${issues.length} issue${issues.length === 1 ? '' : 's'}`)
  process.exit(1)
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
    case 'init':
      if (!argv[1]) {
        console.error('usage: modo init <name>')
        process.exit(1)
      }
      await init(cwd, argv[1])
      break
    case 'add':
      if (!argv[1] || !argv[2]) {
        console.error('usage: modo add <primitive|component|block|token> <name>')
        process.exit(1)
      }
      await add(cwd, argv[1], argv[2])
      break
    case 'check':
      await check(cwd)
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
