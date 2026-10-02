import esbuild, { type BuildOptions, type Message, type Metafile } from 'esbuild'
import mdx from '@mdx-js/esbuild'
import remarkGfm from 'remark-gfm'
import { remarkModoExamples } from './mdx-examples'
import { existsSync, mkdirSync, readdirSync, readFileSync, rmdirSync, rmSync, statSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { parseItemSource, type ParsedItem, type ParsedExample } from '../lib/tsdoc'
import { discoverCssForFile } from '../lib/discover-css'
import { loadModoConfig } from '../lib/config.loader'
import type { SiteConfig } from '../lib/schema'

// One esbuild build for the whole design system: every item, every shell /
// panel module and the `examples` scope module are entry points of the same
// `splitting: true` build, so a module imported by several entries (a React
// context, a theme provider) lands in one shared chunk and exists once at
// runtime. Output: <userRoot>/.modo-tmp/build/{items,usr,scope,chunks}/…

export type Tier = 'primitives' | 'components' | 'blocks'

const TIERS: Tier[] = ['primitives', 'components', 'blocks']

export interface BundledItem {
  id: string
  tier: Tier
  name: string
  description: string
  props: ParsedItem['props']
  examples: ParsedExample[]
  /** Built `{@include ./x.mdx}` docs (.modo-tmp/build/docs/<tier>/<id>.mjs). */
  docs: string[]
  cssFiles: string[]
  /** Source `index.tsx`. */
  file: string
  /** Absolute path of the entry's output (.modo-tmp/build/items/<tier>/<id>.mjs). */
  bundlePath: string
}

/** A `config.shell.*` / `panel.items[].component` module. */
export interface BundledExtra {
  file: string
  bundlePath: string
  cssFiles: string[]
  hasDefault: boolean
}

export interface BundleResult {
  config: SiteConfig | null
  items: BundledItem[]
  /** Keyed by the path string exactly as written in modo.config.ts. */
  extras: Map<string, BundledExtra>
  /** The `examples` module; `exports` excludes `default`. */
  scope: { bundlePath: string; exports: string[] } | null
  errors: string[]
  warnings: string[]
}

export interface Bundler {
  /** The current build; the same object until `invalidate()` is called. */
  get(): Promise<BundleResult>
  invalidate(): void
  outdir: string
}

interface Entry {
  key: string
  file: string
}

interface EntryFailure {
  key: string
  messages: Message[]
}

const LEGACY_FLAT = /^(?:primitives|components|blocks|usr)-.+-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.mjs$/

export function createBundler(opts: { userRoot: string; configPath: string }): Bundler {
  const { userRoot, configPath } = opts
  const tmp = resolve(userRoot, '.modo-tmp')
  const outdir = resolve(tmp, 'build')
  removeLegacyBundles(tmp)

  let current: Promise<BundleResult> | null = null
  let last: Promise<unknown> = Promise.resolve()
  let lastReport = ''

  async function run(): Promise<BundleResult> {
    const errors: string[] = []
    const warnings: string[] = []
    const failures: EntryFailure[] = []

    const config = await loadModoConfig(configPath).catch((err: Error) => {
      // configPlugin reports the full error; items still build without it.
      errors.push(`modo.config: ${err.message}`)
      return null
    })

    // ── items ────────────────────────────────────────────────────────────
    const parsed: Array<Omit<BundledItem, 'bundlePath' | 'docs'> & { key: string; docFiles: string[] }> = []
    for (const tier of TIERS) {
      const tierDir = resolve(userRoot, tier)
      if (!existsSync(tierDir)) continue
      for (const id of readdirSync(tierDir).sort()) {
        const itemDir = resolve(tierDir, id)
        if (!statSync(itemDir).isDirectory()) continue
        const file = resolve(itemDir, 'index.tsx')
        if (!existsSync(file)) continue
        const p = parseItemSource(readFileSync(file, 'utf8'), {
          readFile: (path) => {
            try {
              return readFileSync(resolve(itemDir, path), 'utf8')
            } catch {
              return null
            }
          },
        })
        if (p.errors.length > 0) warnings.push(`${tier}/${id}: ${p.errors.join('; ')}`)
        parsed.push({
          key: `items/${tier}/${id}`,
          id,
          tier,
          name: p.name || id,
          description: p.description,
          props: p.props,
          examples: p.examples,
          docFiles: p.docs.map((d) => resolve(itemDir, d)),
          cssFiles: discoverCssForFile(file),
          file,
        })
      }
    }

    // ── entry table, deduped by file ─────────────────────────────────────
    const keyByFile = new Map<string, string>()
    for (const it of parsed) keyByFile.set(it.file, it.key)
    const usedKeys = new Set(keyByFile.values())
    const keyFor = (file: string, base: string): string => {
      const hit = keyByFile.get(file)
      if (hit) return hit
      let key = base
      for (let n = 2; usedKeys.has(key); n++) key = `${base}-${n}`
      usedKeys.add(key)
      keyByFile.set(file, key)
      return key
    }

    for (const it of parsed) {
      it.docFiles.forEach((f, n) => keyFor(f, `docs/${it.tier}/${it.id}${n > 0 ? `-${n + 1}` : ''}`))
    }

    const extraPaths = [
      ...Object.values(config?.shell ?? {}),
      ...(config?.panel?.items ?? []).map((it) => it.component),
    ].filter((p): p is string => typeof p === 'string')
    const extraKeys = new Map<string, { file: string; key: string }>()
    for (const p of new Set(extraPaths)) {
      const file = resolveUserFile(userRoot, p)
      if (!file) continue // reported by the shell plugin as an unresolved slot/panel item
      extraKeys.set(p, { file, key: keyFor(file, `usr/${sanitize(p)}`) })
    }

    let scopeEntry: { file: string; key: string } | null = null
    if (config?.examples) {
      const file = resolveUserFile(userRoot, config.examples)
      if (file) scopeEntry = { file, key: keyFor(file, 'scope/examples') }
      else errors.push(`examples module "${config.examples}" not found (resolved from ${userRoot})`)
    }

    const entries: Entry[] = [...keyByFile].map(([file, key]) => ({ key, file }))

    // ── build ────────────────────────────────────────────────────────────
    const built = await buildWithIsolation(entries, userRoot, outdir, failures, warnings)
    sweep(outdir, built.outputs)

    const out = (key: string) => resolve(outdir, `${key}.mjs`)
    const ok = (key: string) => built.exports.has(out(key))
    const exportsOf = (key: string) => built.exports.get(out(key)) ?? []

    const items: BundledItem[] = []
    for (const { key, docFiles, ...it } of parsed) {
      if (!ok(key)) continue
      if (!exportsOf(key).includes('default')) {
        errors.push(`${it.tier}/${it.id}: index.tsx has no default export`)
        continue
      }
      const docKeys = docFiles.map((f) => keyByFile.get(f)!).filter(ok)
      items.push({ ...it, docs: docKeys.map(out), bundlePath: out(key) })
    }

    const extras = new Map<string, BundledExtra>()
    for (const [p, { file, key }] of extraKeys) {
      if (!ok(key)) continue
      extras.set(p, {
        file,
        bundlePath: out(key),
        cssFiles: discoverCssForFile(file),
        hasDefault: exportsOf(key).includes('default'),
      })
    }

    let scope: BundleResult['scope'] = null
    if (scopeEntry && ok(scopeEntry.key)) {
      scope = {
        bundlePath: out(scopeEntry.key),
        exports: exportsOf(scopeEntry.key).filter((n) => n !== 'default'),
      }
      const itemNames = new Set(items.map((it) => it.name))
      for (const name of scope.exports) {
        if (itemNames.has(name)) {
          warnings.push(
            `examples export "${name}" collides with the item "${name}"; the item wins inside examples — alias the export (e.g. \`export { ${name} as ${name}Icon }\`)`,
          )
        }
      }
    }

    lastReport = await report(failures, errors, warnings, lastReport)
    errors.push(...failures.map((f) => `${f.key}: ${f.messages.map((m) => m.text).join('; ')}`))
    return { config, items, extras, scope, errors, warnings }
  }

  return {
    outdir,
    get() {
      if (!current) {
        // Builds share one outdir, so never let two overlap (a sweep would
        // delete the other build's fresh outputs).
        const prev = last
        current = prev.then(run, run)
        last = current.catch(() => {})
      }
      return current
    },
    invalidate() {
      current = null
    },
  }
}

// ── esbuild ──────────────────────────────────────────────────────────────

function baseOptions(userRoot: string, outdir: string): BuildOptions {
  return {
    absWorkingDir: userRoot,
    bundle: true,
    format: 'esm',
    outdir,
    outExtension: { '.js': '.mjs' },
    chunkNames: 'chunks/[name]-[hash]',
    assetNames: 'assets/[name]-[hash]',
    // Bundles run in the browser (served via /@fs); 'browser' resolves
    // CJS `main`-only and browser-conditional packages that 'neutral'
    // cannot (e.g. react-remove-scroll, hoist-non-react-statics).
    platform: 'browser',
    target: 'es2022',
    external: ['react', 'react-dom', 'react/jsx-runtime', 'react/jsx-dev-runtime'],
    // CJS deps that `require("react")` at module scope (e.g.
    // `use-sync-external-store/shim`, pulled in by @base-ui) become esbuild's
    // `__require` stub once react is external, and that stub throws in ESM
    // output. The stub delegates to a module-scoped `require` when one exists,
    // so give every chunk one that serves the externals.
    banner: {
      js: [
        "import * as __modoReact from 'react';",
        "import * as __modoReactDOM from 'react-dom';",
        'const require = (id) => {',
        "  if (id === 'react') return __modoReact;",
        "  if (id === 'react-dom') return __modoReactDOM;",
        '  throw new Error(`[modo] dynamic require of "${id}" is not supported`);',
        '};',
      ].join('\n'),
    },
    loader: { '.ts': 'ts', '.tsx': 'tsx', '.css': 'empty', '.svg': 'dataurl' },
    plugins: [mdx({ remarkPlugins: [remarkGfm, remarkModoExamples], jsxImportSource: 'react' })],
    jsx: 'automatic',
    jsxImportSource: 'react',
    logLevel: 'silent',
  }
}

interface Built {
  /** Every file written (absolute) — anything else in outdir is stale. */
  outputs: Set<string>
  /** Absolute output path → its export names, for every entry output. */
  exports: Map<string, string[]>
}

function collect(built: Built, meta: Metafile, userRoot: string): void {
  for (const [path, output] of Object.entries(meta.outputs)) {
    const abs = resolve(userRoot, path)
    built.outputs.add(abs)
    if (output.entryPoint) built.exports.set(abs, output.exports)
  }
}

function messagesOf(err: unknown): Message[] {
  const errs = (err as { errors?: Message[] })?.errors
  if (Array.isArray(errs) && errs.length > 0) return errs
  return [{ id: '', pluginName: '', text: String((err as Error)?.message ?? err), location: null, notes: [], detail: undefined }]
}

// Combined build → on failure, probe each entry alone (write:false) to find
// the culprits, drop them and retry. If no single entry reproduces the error,
// fall back to isolated per-entry bundles (no shared chunks) and say so.
async function buildWithIsolation(
  all: Entry[],
  userRoot: string,
  outdir: string,
  failures: EntryFailure[],
  warnings: string[],
): Promise<Built> {
  const built: Built = { outputs: new Set(), exports: new Map() }
  if (all.length === 0) return built
  mkdirSync(outdir, { recursive: true })
  const base = baseOptions(userRoot, outdir)
  let entries = all

  while (entries.length > 0) {
    try {
      const r = await esbuild.build({
        ...base,
        entryPoints: Object.fromEntries(entries.map((e) => [e.key, e.file])),
        splitting: true,
        metafile: true,
      })
      collect(built, r.metafile!, userRoot)
      return built
    } catch (combinedErr) {
      const probes = await Promise.all(
        entries.map(async (e): Promise<EntryFailure | null> => {
          try {
            await esbuild.build({ ...base, entryPoints: { [e.key]: e.file }, write: false })
            return null
          } catch (err) {
            return { key: e.key, messages: messagesOf(err) }
          }
        }),
      )
      const culprits = probes.filter((p): p is EntryFailure => p !== null)
      if (culprits.length > 0) {
        failures.push(...culprits)
        const bad = new Set(culprits.map((c) => c.key))
        entries = entries.filter((e) => !bad.has(e.key))
        continue
      }

      warnings.push(
        'SHARED BUILD DISABLED — the combined build failed but no single entry reproduces the error, so every entry ' +
          'is bundled on its own. Modules shared between items (React contexts, providers) are duplicated per item in this mode.',
      )
      failures.push({ key: '(combined build)', messages: messagesOf(combinedErr) })
      await Promise.all(
        entries.map(async (e) => {
          try {
            const r = await esbuild.build({ ...base, entryPoints: { [e.key]: e.file }, metafile: true })
            collect(built, r.metafile!, userRoot)
          } catch (err) {
            failures.push({ key: e.key, messages: messagesOf(err) })
          }
        }),
      )
      return built
    }
  }
  return built
}

// ── reporting ────────────────────────────────────────────────────────────

async function report(
  failures: EntryFailure[],
  errors: string[],
  warnings: string[],
  previous: string,
): Promise<string> {
  const lines: string[] = []

  // The same message (a broken shared module) surfaces once per entry that
  // imports it — print it once, listing the affected entries.
  const groups = new Map<string, { message: Message; keys: string[] }>()
  for (const f of failures) {
    for (const m of f.messages) {
      const loc = m.location ? `${m.location.file}:${m.location.line}:${m.location.column}` : ''
      const id = `${m.text}\0${loc}`
      const g = groups.get(id)
      if (g) {
        if (!g.keys.includes(f.key)) g.keys.push(f.key)
      } else groups.set(id, { message: m, keys: [f.key] })
    }
  }
  if (groups.size > 0) {
    const skipped = [...new Set(failures.map((f) => f.key))].filter((k) => !k.startsWith('('))
    lines.push(`[modo:bundle] ${groups.size} error(s)${skipped.length ? ` — skipped: ${skipped.join(', ')}` : ''}`)
    const color = Boolean(process.stderr.isTTY)
    for (const { message, keys } of groups.values()) {
      const [formatted] = await esbuild.formatMessages([message], { kind: 'error', color })
      lines.push((formatted ?? message.text).trimEnd(), `    in: ${keys.join(', ')}`, '')
    }
  }
  for (const e of errors) lines.push(`[modo:bundle] error: ${e}`)
  for (const w of warnings) lines.push(`[modo:bundle] warning: ${w}`)

  const text = lines.length > 0 ? lines.join('\n') + '\n' : ''
  // Rebuilds on every source change — don't repeat an unchanged report.
  if (text && text !== previous) process.stderr.write(text)
  return text
}

// ── files ────────────────────────────────────────────────────────────────

/** `./x` → x (file), x/index.{tsx,ts,jsx,js} (dir) or x.{tsx,ts,jsx,js}. */
function resolveUserFile(userRoot: string, p: string): string | null {
  const abs = resolve(userRoot, p)
  const exts = ['.tsx', '.ts', '.jsx', '.js']
  if (existsSync(abs)) {
    if (statSync(abs).isFile()) return abs
    for (const ext of exts) {
      const f = resolve(abs, `index${ext}`)
      if (existsSync(f)) return f
    }
    return null
  }
  for (const ext of exts) if (existsSync(abs + ext)) return abs + ext
  return null
}

function sanitize(p: string): string {
  return p.replace(/\.(tsx?|jsx?)$/, '').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'module'
}

/** Delete everything in outdir the last build didn't write (old hashed chunks, removed items). */
function sweep(outdir: string, keep: Set<string>): void {
  if (!existsSync(outdir)) return
  const walk = (dir: string): boolean => {
    let empty = true
    for (const name of readdirSync(dir)) {
      const abs = join(dir, name)
      if (statSync(abs).isDirectory()) {
        if (walk(abs)) rmdirSync(abs)
        else empty = false
      } else if (!keep.has(abs)) {
        rmSync(abs, { force: true })
      } else {
        empty = false
      }
    }
    return empty
  }
  try {
    walk(outdir)
  } catch (err) {
    process.stderr.write(`[modo:bundle] warning: could not clean ${relative(process.cwd(), outdir)}: ${(err as Error).message}\n`)
  }
}

/** Pre-shared-build versions wrote flat `<tier|usr>-<id>-<uuid>.mjs` files into .modo-tmp. */
function removeLegacyBundles(tmp: string): void {
  if (!existsSync(tmp)) return
  for (const name of readdirSync(tmp)) {
    if (LEGACY_FLAT.test(name)) rmSync(join(tmp, name), { force: true })
  }
}
