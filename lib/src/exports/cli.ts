#!/usr/bin/env node
import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync, existsSync, copyFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadModoConfig } from '../lib/config.loader'

const __dirname = dirname(fileURLToPath(import.meta.url))
const libRoot = resolve(__dirname, '..')
const runtimeRoot = resolve(libRoot, 'src', 'runtime')
const templatesRoot = resolve(libRoot, 'templates')

const HELP = `modo — atomic design system renderer

Usage:
  modo init <name>         Scaffold a new design system project
  modo dev                 Start the docs dev server
  modo build               Build the docs site
  modo add <kind> <name>   Add a new primitive/component/block/token
  modo check               Validate modo.config.ts

Options:
  --help, -h               Show this help
  --version, -v            Print version
`

function exitWithError(err: unknown) {
  const msg = err instanceof Error ? err.message : String(err)
  process.stderr.write(`Error: ${msg}\n`)
  if (process.env.MODO_DEBUG && err instanceof Error) {
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

  try {
    switch (cmd) {
      case 'init': await runInit(args.slice(1)); break
      case 'dev': await runVite('dev', args.slice(1)); break
      case 'build': await runVite('build', args.slice(1)); break
      case 'add': await runAdd(args.slice(1)); break
      case 'check': await runCheck(); break
      default:
        process.stderr.write(`Unknown command: ${cmd}\n\n${HELP}`)
        process.exit(1)
    }
  } catch (err) {
    exitWithError(err)
  }
}

async function runInit(args: string[]) {
  const [first, second] = args
  if (!first) throw new Error('init requires a project name (e.g. `modo init my-ds`)')
  const outDir = second ? resolve(process.cwd(), first) : process.cwd()
  const name = second ?? first
  const projectDir = resolve(outDir, name)
  if (existsSync(projectDir)) throw new Error(`Directory already exists: ${projectDir}`)

  copyDir(templatesRoot, 'default', projectDir)
  forFileTree(projectDir, (file) => {
    const text = readFileSync(file, 'utf8')
    if (text.includes('__NAME__') || text.includes('__DESCRIPTION__')) {
      writeFileSync(file, text
        .replaceAll('__NAME__', name)
        .replaceAll('__DESCRIPTION__', `${name} design system`))
    }
  })
  process.stdout.write(`Scaffolded ${projectDir}\n`)
}

async function runVite(mode: 'dev' | 'build', args: string[] = []) {
  const cwd = process.cwd()
  const configIdx = args.indexOf('--config')
  const configArg = configIdx >= 0 ? args[configIdx + 1] : undefined
  const configPath = configArg ? resolve(cwd, configArg) : resolve(cwd, 'modo.config.ts')
  await loadModoConfig(configPath)
  process.env.MODO_USER_ROOT = cwd
  process.env.MODO_CONFIG_PATH = configPath
  process.chdir(runtimeRoot)
  await importViteAndRun(runtimeRoot, mode)
}

async function runAdd(args: string[]) {
  const [kind, name] = args
  if (!kind || !name) {
    throw new Error('add requires `<kind> <name>` where kind is primitive|component|block|token')
  }
  const targets: Record<string, { dir: string; stub: string; ext: string }> = {
    primitive: { dir: 'primitives', stub: 'primitive.tsx', ext: 'tsx' },
    component: { dir: 'components', stub: 'component.tsx', ext: 'tsx' },
    block: { dir: 'blocks', stub: 'block.tsx', ext: 'tsx' },
    token: { dir: 'tokens', stub: 'token.css', ext: 'css' },
  }
  const t = targets[kind]
  if (!t) throw new Error(`Unknown kind: ${kind}. Expected one of: ${Object.keys(targets).join(', ')}`)

  const id = kebab(name)
  const outDir = resolve(process.cwd(), t.dir, id)
  mkdirSync(outDir, { recursive: true })

  const stubText = readFileSync(resolve(templatesRoot, 'stubs', t.stub), 'utf8')
  const outFile = resolve(outDir, `${id}.${t.ext}`)
  writeFileSync(outFile, stubText
    .replaceAll('__NAME__', id)
    .replaceAll('__NAME_PASCAL__', pascalize(id)))
  process.stdout.write(`Created ${outFile}\n`)
}

async function runCheck() {
  const cfg = await loadModoConfig(resolve(process.cwd(), 'modo.config.ts'))
  process.stdout.write(`OK — modo.config.ts is valid (name="${cfg.name}")\n`)
}

async function importViteAndRun(rt: string, mode: 'dev' | 'build') {
  const configFile = join(rt, 'vite.config.ts')
  const vite = await import('vite')
  if (mode === 'dev') {
    const server = await vite.createServer({ configFile })
    await server.listen()
    server.printUrls()
    return
  }
  await vite.build({ configFile })
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
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : ''))
    .join('')
}

function copyDir(root: string, sub: string, dest: string) {
  const src = resolve(root, sub)
  if (!existsSync(src)) throw new Error(`Missing template: ${src}`)
  mkdirSync(dest, { recursive: true })
  const stack: string[] = [src]
  while (stack.length) {
    const dir = stack.pop()!
    for (const entry of readdirSync(dir)) {
      if (entry === '.DS_Store') continue
      const full = resolve(dir, entry)
      if (statSync(full).isDirectory()) {
        stack.push(full)
        continue
      }
      const target = resolve(dest, full.slice(src.length).replace(/^\//, ''))
      mkdirSync(dirname(target), { recursive: true })
      copyFileSync(full, target)
    }
  }
}

function forFileTree(root: string, cb: (file: string, rel: string) => void): void {
  const stack: { dir: string; rel: string }[] = [{ dir: root, rel: '' }]
  while (stack.length) {
    const { dir, rel: dirRel } = stack.pop()!
    for (const entry of readdirSync(dir)) {
      if (entry === '.DS_Store') continue
      const full = resolve(dir, entry)
      const rel = dirRel ? `${dirRel}/${entry}` : entry
      if (statSync(full).isDirectory()) {
        stack.push({ dir: full, rel })
        continue
      }
      cb(full, rel)
    }
  }
}

main().catch(exitWithError)
