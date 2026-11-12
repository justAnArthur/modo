#!/usr/bin/env node
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, renameSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadModoConfig } from '../lib/config.loader'

const __dirname = dirname(fileURLToPath(import.meta.url))
const libRoot = resolve(__dirname, '..')
const runtimeRoot = resolve(libRoot, 'src', 'runtime')
const templatesRoot = resolve(libRoot, 'templates')
const viteConfigFile = join(runtimeRoot, 'vite.config.ts')
const libPackage = JSON.parse(readFileSync(resolve(libRoot, 'package.json'), 'utf8')) as {
  name: string
  version: string
}
const DEBUG = process.env.MODO_DEBUG

const HELP = `modo — turns a design system into its own docs site

Usage:
  modo init <name>         Scaffold a design system in ./<name>
  modo init <dir> <name>   Scaffold it in <dir>/<name>
  modo dev                 Start the docs dev server
  modo build               Build the docs site into ./dist
  modo preview             Serve the built site
  modo add <kind> <name>   Add a primitive, component, block, page or token (<group>/[<group>/]<name> groups an item)
  modo check               Validate modo.config.ts

Options (--flag value or --flag=value):
  --config <file>          dev, build, preview, check: the config file (default modo.config.ts)
  --port <port>            dev, preview: the port (default 5173 for dev, 4173 for preview)
  --host [<host>]          dev, preview: the address to listen on (default 127.0.0.1; a bare --host listens on all)
  --base <path>            build, preview: public path the site is served under (default /)
  --out <dir>              build, preview: the output dir (default ./dist)
  --help, -h               Show this help
  --version, -v            Print version
`

// The flags each command takes.
const FLAGS = new Map<string, string[]>([
  ['init', []],
  ['dev', ['--config', '--port', '--host']],
  ['build', ['--config', '--base', '--out']],
  ['preview', ['--config', '--port', '--host', '--base', '--out']],
  ['add', []],
  ['check', ['--config']],
])

// Flags that may stand alone; a bare `--host` means every address, as in Vite.
const BARE_FLAGS = new Set(['--host'])

// Unscoped npm package names only: the name is also the project's directory.
const PACKAGE_NAME = /^[a-z0-9][a-z0-9._~-]*$/

interface Args {
  positionals: string[]
  flags: Map<string, string | true>
}

class UsageError extends Error {}

// Vite 8's build() throws a BundleError whose message embeds every inner
// error's stack; the inner errors say it in one line each.
interface PluginError extends Error {
  plugin?: string
}

function errorLines(err: unknown): string[] {
  if (!(err instanceof Error)) return [String(err)]
  const inner = (err as { errors?: unknown }).errors
  if (!Array.isArray(inner) || inner.length === 0) return [err.message]
  return inner.map((e: PluginError) => (e.plugin ? `[${e.plugin}] ${e.message}` : e.message))
}

function exitWithError(err: unknown) {
  for (const line of errorLines(err)) process.stderr.write(`Error: ${line}\n`)
  if (err instanceof UsageError) process.stderr.write(`\n${HELP}`)
  if (DEBUG && err instanceof Error) {
    process.stderr.write(`${err.stack ?? ''}\n`)
  }
  process.exit(1)
}

async function main() {
  const [cmd, ...rest] = process.argv.slice(2)

  if (!cmd || cmd === '--help' || cmd === '-h' || rest.includes('--help') || rest.includes('-h')) {
    process.stdout.write(HELP)
    return
  }

  if (cmd === '--version' || cmd === '-v') {
    process.stdout.write(`${libPackage.name} ${libPackage.version}\n`)
    return
  }

  const known = FLAGS.get(cmd)
  if (!known) throw new UsageError(`Unknown command: ${cmd}`)

  const args = parseArgs(cmd, known, rest)
  switch (cmd) {
    case 'init':
      return runInit(args)
    case 'dev':
      return runDev(args)
    case 'build':
      return runBuild(args)
    case 'preview':
      return runPreview(args)
    case 'add':
      return runAdd(args)
    case 'check':
      return runCheck(args)
  }
}

function parseArgs(cmd: string, known: string[], argv: string[]): Args {
  const positionals: string[] = []
  const flags = new Map<string, string | true>()
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!
    if (!arg.startsWith('-')) {
      positionals.push(arg)
      continue
    }

    const eq = arg.indexOf('=')
    const name = eq >= 0 ? arg.slice(0, eq) : arg
    if (!known.includes(name)) throw new UsageError(`Unknown option for \`modo ${cmd}\`: ${name}`)
    if (eq >= 0) {
      flags.set(name, arg.slice(eq + 1))
      continue
    }

    const next = argv[i + 1]
    if (next !== undefined && !next.startsWith('-')) {
      flags.set(name, next)
      i++
      continue
    }
    if (!BARE_FLAGS.has(name)) throw new UsageError(`${name} needs a value`)
    flags.set(name, true)
  }
  return { positionals, flags }
}

function stringFlag(args: Args, name: string): string | undefined {
  const value = args.flags.get(name)
  if (typeof value === 'boolean') throw new UsageError(`${name} needs a value`)
  return value
}

function portFlag(args: Args): number | undefined {
  const value = stringFlag(args, '--port')
  if (value === undefined) return undefined
  const port = Number(value)
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    throw new UsageError(`--port must be a port number, got ${value}`)
  }
  return port
}

function configOf(args: Args): string {
  return resolve(process.cwd(), stringFlag(args, '--config') ?? 'modo.config.ts')
}

async function runInit(args: Args) {
  const [first, second, extra] = args.positionals
  if (!first) throw new UsageError('init requires a project name (e.g. `modo init my-ds`)')
  if (extra) throw new UsageError(`init takes <name> or <dir> <name>, got an extra argument: ${extra}`)
  const outDir = second ? resolve(process.cwd(), first) : process.cwd()
  const name = second ?? first
  if (name.length > 214 || !PACKAGE_NAME.test(name)) {
    throw new Error(
      `Invalid project name "${name}". It becomes the npm package name: use lowercase letters, digits, "-", ".", "_" or "~", starting with a letter or digit, at most 214 characters.`,
    )
  }
  const projectDir = resolve(outDir, name)
  if (existsSync(projectDir)) throw new Error(`Directory already exists: ${projectDir}`)

  cpSync(resolve(templatesRoot, 'default'), projectDir, { recursive: true, filter: src => !src.endsWith('.DS_Store') })
  // npm leaves .gitignore out of published packages, so the template ships it as _gitignore.
  renameSync(resolve(projectDir, '_gitignore'), resolve(projectDir, '.gitignore'))
  for (const rel of readdirSync(projectDir, { recursive: true, encoding: 'utf8' })) {
    const file = resolve(projectDir, rel)
    if (!statSync(file).isFile()) continue
    const text = readFileSync(file, 'utf8')
    writeFileSync(
      file,
      text
        .replaceAll('__NAME__', name)
        .replaceAll('__DESCRIPTION__', `${name} design system`)
        .replaceAll('__MODO_VERSION__', `^${libPackage.version}`),
    )
  }

  const pm = process.env.npm_config_user_agent?.split('/')[0] || 'npm'
  process.stdout.write(
    `Scaffolded ${projectDir}\n\nNext steps:\n  cd ${relative(process.cwd(), projectDir)}\n  ${pm} install\n  ${pm} run dev    # modo dev\n`,
  )
}

// The runtime's vite.config.ts reads the project from these, then runs from its own dir.
async function prepareRuntime(args: Args): Promise<string> {
  const cwd = process.cwd()
  const configPath = configOf(args)
  await loadModoConfig(configPath)
  process.env.MODO_USER_ROOT = cwd
  process.env.MODO_CONFIG_PATH = configPath
  // Vite 8 warns that this config won't load under `configLoader: 'native'`.
  // It can't (the plugins import .tsx; Node strips types only from 22.18), and
  // the user can't act on a config modo owns.
  process.env.VITE_CONFIG_NATIVE_IGNORE_WARNING ??= 'true'
  process.chdir(runtimeRoot)
  return cwd
}

async function runDev(args: Args) {
  const server = { port: portFlag(args), host: args.flags.get('--host') }
  await prepareRuntime(args)
  const vite = await import('vite')
  const dev = await vite.createServer({ configFile: viteConfigFile, server })
  await dev.listen()
  dev.printUrls()
}

async function runBuild(args: Args) {
  const base = stringFlag(args, '--base')
  const out = stringFlag(args, '--out')
  const cwd = await prepareRuntime(args)
  const vite = await import('vite')
  await vite.build({ configFile: viteConfigFile, base, build: { outDir: out && resolve(cwd, out) } })
}

// Serves the built files as they are: no modo plugins, nothing rebuilds.
async function runPreview(args: Args) {
  const cwd = process.cwd()
  const cfg = await loadModoConfig(configOf(args))
  const outDir = resolve(cwd, stringFlag(args, '--out') ?? 'dist')
  if (!existsSync(join(outDir, 'index.html'))) throw new Error(`No build in ${outDir}. Run \`modo build\` first.`)

  const vite = await import('vite')
  const server = await vite.preview({
    configFile: false,
    root: cwd,
    base: stringFlag(args, '--base') ?? cfg.base ?? '/',
    build: { outDir },
    preview: { port: portFlag(args), host: args.flags.get('--host') ?? '127.0.0.1' },
  })
  server.printUrls()
}

// An item is <tier>/[<group>/…]<id>/index.tsx with its examples beside it; a
// token group is a flat tokens/<id>.css.
const TIERS: Record<string, string> = {
  primitive: 'primitives',
  component: 'components',
  block: 'blocks',
  page: 'pages',
}

async function runAdd(args: Args) {
  const [kind, name] = args.positionals
  if (!kind || !name || !(kind in TIERS || kind === 'token')) {
    throw new UsageError('add requires `<kind> <name>`, kind one of primitive, component, block, page, token')
  }
  // `overlays/dialog` puts the item in a group folder, `inputs/date-time/calendar` in a nested one.
  const path = name.split('/').map(kebab)
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

async function runCheck(args: Args) {
  const configPath = configOf(args)
  const cfg = await loadModoConfig(configPath)
  process.stdout.write(`OK — ${configPath} is valid (name="${cfg.name}")\n`)
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
