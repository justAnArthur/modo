#!/usr/bin/env node
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadModoConfig } from '../lib/config.loader'

const __dirname = dirname(fileURLToPath(import.meta.url))
const libRoot = resolve(__dirname, '..')
const runtimeRoot = resolve(libRoot, 'src', 'runtime')
const templatesRoot = resolve(libRoot, 'templates')
const DEBUG = process.env.MODO_DEBUG

const HELP = `modo — atomic design system renderer

Usage:
  modo init <name>         Scaffold a design system in ./<name>
  modo init <dir> <name>   Scaffold it in <dir>/<name>
  modo dev                 Start the docs dev server
  modo build               Build the docs site into ./dist
  modo add <kind> <name>   Add a primitive, component, block or token (<group>/<name> groups an item)
  modo check               Validate modo.config.ts

Options:
  --config <file>          dev, build, check: the config file (default modo.config.ts)
  --base <path>            build: public path the site is served under (default /)
  --help, -h               Show this help
  --version, -v            Print version
`

function exitWithError(err: unknown) {
  const msg = err instanceof Error ? err.message : String(err)
  process.stderr.write(`Error: ${msg}\n`)
  if (DEBUG && err instanceof Error) {
    process.stderr.write(`${err.stack ?? ''}\n`)
  }
  process.exit(1)
}

async function main() {
  const args = process.argv.slice(2)
  const cmd = args[0]

  if (!cmd || cmd === '--help' || cmd === '-h') {
    process.stdout.write(HELP)
    return
  }

  if (cmd === '--version' || cmd === '-v') {
    const pkg = JSON.parse(readFileSync(resolve(libRoot, 'package.json'), 'utf8'))
    process.stdout.write(`${pkg.name} ${pkg.version}\n`)
    return
  }

  switch (cmd) {
    case 'init':
      return runInit(args.slice(1))
    case 'dev':
      return runVite('dev', args.slice(1))
    case 'build':
      return runVite('build', args.slice(1))
    case 'add':
      return runAdd(args.slice(1))
    case 'check':
      return runCheck(args.slice(1))
    default:
      process.stderr.write(`Unknown command: ${cmd}\n\n${HELP}`)
      process.exit(1)
  }
}

async function runInit(args: string[]) {
  const [first, second] = args
  if (!first) throw new Error('init requires a project name (e.g. `modo init my-ds`)')
  const outDir = second ? resolve(process.cwd(), first) : process.cwd()
  const name = second ?? first
  const projectDir = resolve(outDir, name)
  if (existsSync(projectDir)) throw new Error(`Directory already exists: ${projectDir}`)

  cpSync(resolve(templatesRoot, 'default'), projectDir, { recursive: true, filter: src => !src.endsWith('.DS_Store') })
  for (const rel of readdirSync(projectDir, { recursive: true, encoding: 'utf8' })) {
    const file = resolve(projectDir, rel)
    if (!statSync(file).isFile()) continue
    const text = readFileSync(file, 'utf8')
    writeFileSync(file, text.replaceAll('__NAME__', name).replaceAll('__DESCRIPTION__', `${name} design system`))
  }
  process.stdout.write(`Scaffolded ${projectDir}\n`)
}

async function runVite(mode: 'dev' | 'build', args: string[] = []) {
  const cwd = process.cwd()
  const configPath = configOf(args)
  await loadModoConfig(configPath)
  process.env.MODO_USER_ROOT = cwd
  process.env.MODO_CONFIG_PATH = configPath
  process.chdir(runtimeRoot)
  await importViteAndRun(runtimeRoot, mode, flag(args, '--base'))
}

function configOf(args: string[]): string {
  return resolve(process.cwd(), flag(args, '--config') ?? 'modo.config.ts')
}

function flag(args: string[], name: string): string | undefined {
  const i = args.indexOf(name)
  return i >= 0 ? args[i + 1] : undefined
}

// An item is <tier>/[<group>/]<id>/index.tsx with its examples beside it; a
// token group is a flat tokens/<id>.css.
const TIERS: Record<string, string> = { primitive: 'primitives', component: 'components', block: 'blocks' }

async function runAdd(args: string[]) {
  const [kind, name] = args
  if (!kind || !name || !(kind in TIERS || kind === 'token')) {
    throw new Error('add requires `<kind> <name>`, kind one of primitive, component, block, token')
  }
  // `overlays/dialog` puts the item in a group folder; groups don't nest.
  const path = name.split('/').map(kebab)
  if (path.length > 2) throw new Error('add takes `<name>` or `<group>/<name>`')
  const id = path.at(-1)!
  const dir = path.join('/')
  const fill = (stub: string) =>
    readFileSync(resolve(templatesRoot, 'stubs', stub), 'utf8')
      .replaceAll('__NAME__', id)
      .replaceAll('__NAME_PASCAL__', pascalize(id))
  const files: Record<string, string> =
    kind === 'token'
      ? { [`tokens/${id}.css`]: fill('token.css') }
      : {
          [`${TIERS[kind]}/${dir}/index.tsx`]: fill('item.tsx'),
          [`${TIERS[kind]}/${dir}/examples.mdx`]: fill('examples.mdx'),
        }

  for (const [rel, text] of Object.entries(files)) {
    const file = resolve(process.cwd(), rel)
    if (existsSync(file)) throw new Error(`Already exists: ${file}`)
    mkdirSync(dirname(file), { recursive: true })
    writeFileSync(file, text)
    process.stdout.write(`Created ${file}\n`)
  }
}

async function runCheck(args: string[]) {
  const configPath = configOf(args)
  const cfg = await loadModoConfig(configPath)
  process.stdout.write(`OK — ${configPath} is valid (name="${cfg.name}")\n`)
}

async function importViteAndRun(rt: string, mode: 'dev' | 'build', base?: string) {
  const configFile = join(rt, 'vite.config.ts')
  const vite = await import('vite')
  if (mode === 'dev') {
    const server = await vite.createServer({ configFile })
    await server.listen()
    server.printUrls()
    return
  }
  await vite.build({ configFile, base })
}

function kebab(s: string): string {
  return s
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase()
}

function pascalize(s: string): string {
  return s
    .split(/[-_\s]+/)
    .map(w => (w ? w.charAt(0).toUpperCase() + w.slice(1) : ''))
    .join('')
}

main().catch(exitWithError)
