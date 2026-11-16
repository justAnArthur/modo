import { existsSync, mkdirSync, readdirSync, rmdirSync, rmSync, statSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import mdx from '@mdx-js/esbuild'
import esbuild, { type BuildOptions, type Message, type Metafile, type Plugin } from 'esbuild'
import remarkFrontmatter from 'remark-frontmatter'
import remarkGfm from 'remark-gfm'
import { isComponentRef, splitRef } from '../lib/refs'
import type { SiteConfig } from '../lib/schema'
import { loadModoConfig } from '../node/config-loader'
import { discoverCssForFile, itemsRootOf, parseItems, type SourceItem } from '../node/discover'
import { type DiscoveredGuide, discoverGuides } from '../node/discover-guides'
import { createDocsService } from '../node/docs'
import { isModoPackage, packageDirOf, resolveSourceExport, resolveUserFile } from '../node/resolve-ref'
import { remarkModoExamples } from './mdx-examples'
import { createReporter } from './report'

// One `splitting: true` esbuild build for every item, shell / panel module and
// the `examples` scope module: a module several entries import (a React
// context, a theme provider) lands in one shared chunk and exists once.

export interface BundledItem extends SourceItem {
  /** The built `.mdx` examples (.modo-tmp/build/examples/<tier>/<id>.mjs). */
  mdxExamples: string[]
  /** The entry's output (.modo-tmp/build/items/<tier>/<id>.mjs). */
  bundlePath: string
}

export interface BundledGuide extends Omit<DiscoveredGuide, 'file'> {
  /** The entry's output (.modo-tmp/build/guides/<slug>.mjs). */
  bundlePath: string
}

/** A `config.shell.*` / `panel.items[].component` / component `logo` module. */
interface BundledExtra {
  bundlePath: string
  cssFiles: string[]
  /** The export a reference names: `./file.tsx#Name`, else `default`. */
  exportName: string
  /** Whether the built module has that export. */
  exported: boolean
}

export interface BundleResult {
  config: SiteConfig | null
  items: BundledItem[]
  /** The `guides/` folder's `.mdx` pages, in file-name order. */
  guides: BundledGuide[]
  /** Keyed by the reference exactly as written in modo.config.ts. */
  extras: Map<string, BundledExtra>
  /** The `examples` module; `exports` excludes `default`. */
  scope: { bundlePath: string; exports: string[] } | null
  /** Errors reported for this build (failed entries, skipped items, a broken config); `modo build` fails on any. */
  errorCount: number
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

export function createBundler(opts: { userRoot: string; configPath: string }): Bundler {
  const { userRoot, configPath } = opts
  const outdir = resolve(userRoot, '.modo-tmp', 'build')
  const report = createReporter('bundle')

  let current: Promise<BundleResult> | null = null
  let last: Promise<unknown> = Promise.resolve()
  // One per bundler: in dev, each run reuses the files the last one parsed.
  const docs = createDocsService({ root: userRoot })
  let warnedNoTypeScript = false

  async function run(): Promise<BundleResult> {
    const failures: EntryFailure[] = []
    const errors: string[] = []
    const config = await loadModoConfig(configPath).catch((err: Error) => {
      // configPlugin reports the full error; items still build without it.
      errors.push(`modo.config: ${err.message}`)
      return null
    })
    const root = itemsRootOf(userRoot, config)
    if (!existsSync(root)) errors.push(`root "${config?.root}" not found (resolved to ${root})`)
    const service = await docs
    const { items: sources, errors: itemErrors, warnings } = parseItems(userRoot, root, service)
    errors.push(...itemErrors)
    if (!service && !warnedNoTypeScript) {
      warnedNoTypeScript = true
      warnings.push(
        'typescript (>=5) is not installed: items are read by the plain parser, without re-exported items, {@inheritDoc} or props declared in other types',
      )
    }
    const parsed = sources.map(it => ({ ...it, key: `items/${it.tier}/${it.id}` }))

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

    for (const it of parsed) for (const doc of it.mdxExamples) keyFor(doc, `examples/${it.tier}/${it.id}`)

    const found = discoverGuides(resolve(root, 'guides'))
    errors.push(...found.errors)
    warnings.push(...found.warnings)
    const guideKeys = found.guides.map(({ file, ...guide }) => ({
      guide,
      key: keyFor(file, `guides/${guide.slug || 'index'}`),
    }))

    const extraPaths = [
      ...Object.values(config?.shell ?? {}),
      ...(config?.panel?.items ?? []).map(it => it.component),
      config?.logo && isComponentRef(config.logo) ? config.logo : undefined,
    ].filter((p): p is string => typeof p === 'string')
    // Several refs into one file (`./modo.components.tsx#Select`, `@scope/ds/docs#Select`) share its entry.
    const extraKeys = new Map<string, { file: string; key: string; exportName: string }>()
    for (const p of new Set(extraPaths)) {
      const { path, exportName } = splitRef(p)
      const file = resolveUserFile(userRoot, path)
      // The shell plugin reports it as an unresolved slot or panel item.
      if (!file) continue
      extraKeys.set(p, { file, exportName, key: keyFor(file, `usr/${sanitize(path)}`) })
    }

    let scopeEntry: { file: string; key: string } | null = null
    if (config?.examples) {
      const file = resolveUserFile(userRoot, config.examples)
      if (file) scopeEntry = { file, key: keyFor(file, 'scope/examples') }
      else errors.push(`examples module "${config.examples}" not found (resolved from ${userRoot})`)
    }

    const entries: Entry[] = [...keyByFile].map(([file, key]) => ({ key, file }))

    const built = await buildWithIsolation(entries, userRoot, outdir, failures, warnings)
    sweep(outdir, built.outputs, warnings)

    const out = (key: string) => resolve(outdir, `${key}.mjs`)
    const ok = (key: string) => built.exports.has(out(key))
    const exportsOf = (key: string) => built.exports.get(out(key)) ?? []

    const items: BundledItem[] = []
    for (const { key, mdxExamples, ...it } of parsed) {
      if (!ok(key)) continue
      if (!exportsOf(key).includes('default')) {
        errors.push(`${it.tier}/${it.id}: index.tsx has no default export`)
        continue
      }
      const docKeys = mdxExamples.map(doc => keyByFile.get(doc)!).filter(ok)
      items.push({ ...it, mdxExamples: docKeys.map(out), bundlePath: out(key) })
    }

    const guides = guideKeys.filter(({ key }) => ok(key)).map(({ guide, key }) => ({ ...guide, bundlePath: out(key) }))

    const extras = new Map<string, BundledExtra>()
    for (const [p, { file, key, exportName }] of extraKeys) {
      if (!ok(key)) continue
      extras.set(p, {
        bundlePath: out(key),
        cssFiles: discoverCssForFile(file),
        exportName,
        exported: exportsOf(key).includes(exportName),
      })
    }

    let scope: BundleResult['scope'] = null
    if (scopeEntry && ok(scopeEntry.key)) {
      scope = {
        bundlePath: out(scopeEntry.key),
        exports: exportsOf(scopeEntry.key).filter(n => n !== 'default'),
      }
      const itemNames = new Set(items.map(it => it.name))
      for (const name of scope.exports) {
        if (itemNames.has(name)) {
          warnings.push(
            `examples export "${name}" collides with the item "${name}"; the item wins inside examples — alias the export (e.g. \`export { ${name} as ${name}Icon }\`)`,
          )
        }
      }
    }

    report({ lines: await failureLines(failures), errors, warnings })
    return { config, items, guides, extras, scope, errorCount: failures.length + errors.length }
  }

  return {
    outdir,
    get() {
      if (!current) {
        // Builds share one outdir, so never let two overlap (a sweep would
        // delete the other build's fresh outputs).
        current = last.then(run)
        last = current.catch(() => {})
      }
      return current
    },
    invalidate() {
      current = null
    },
  }
}

/**
 * A design system documented with modo that publishes its sources (`source` export condition)
 * is bundled from them, as its docs are read from them: an item and the examples.mdx beside its
 * source then share one copy of each module. Only those packages, and only when the source
 * ships; every other import resolves with esbuild's default conditions.
 */
function modoSources(): Plugin {
  return {
    name: 'modo:sources',
    setup(build) {
      const cache = new Map<string, string | null>()
      build.onStart(() => cache.clear())
      build.onResolve({ filter: /^[^./]/ }, args => {
        if (args.kind === 'entry-point') return undefined
        const key = `${args.resolveDir}\0${args.path}`
        let path = cache.get(key)
        if (path === undefined) {
          const file = resolveSourceExport(args.path, args.resolveDir)
          const pkg = file && packageDirOf(file)
          path = file && pkg && isModoPackage(pkg) ? file : null
          cache.set(key, path)
        }
        return path ? { path } : undefined
      })
    },
  }
}

function baseOptions(userRoot: string, outdir: string): BuildOptions {
  return {
    absWorkingDir: userRoot,
    bundle: true,
    format: 'esm',
    outdir,
    outExtension: { '.js': '.mjs' },
    chunkNames: 'chunks/[name]-[hash]',
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
        // biome-ignore lint/suspicious/noTemplateCurlyInString: a template literal in generated code
        '  throw new Error(`[modo] dynamic require of "${id}" is not supported`);',
        '};',
      ].join('\n'),
    },
    loader: { '.ts': 'ts', '.tsx': 'tsx', '.css': 'empty', '.svg': 'dataurl' },
    plugins: [
      modoSources(),
      mdx({ remarkPlugins: [remarkGfm, remarkFrontmatter, remarkModoExamples], jsxImportSource: 'react' }),
    ],
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
  return [
    {
      id: '',
      pluginName: '',
      text: String((err as Error)?.message ?? err),
      location: null,
      notes: [],
      detail: undefined,
    },
  ]
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
        entryPoints: Object.fromEntries(entries.map(e => [e.key, e.file])),
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
        const bad = new Set(culprits.map(c => c.key))
        entries = entries.filter(e => !bad.has(e.key))
        continue
      }

      warnings.push(
        'SHARED BUILD DISABLED — the combined build failed but no single entry reproduces the error, so every entry ' +
          'is bundled on its own. Modules shared between items (React contexts, providers) are duplicated per item in this mode.',
      )
      failures.push({ key: '(combined build)', messages: messagesOf(combinedErr) })
      await Promise.all(
        entries.map(async e => {
          try {
            const r = await esbuild.build({
              ...base,
              entryPoints: { [e.key]: e.file },
              metafile: true,
            })
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

// The same message (a broken shared module) surfaces once per entry that
// imports it: print it once, listing the affected entries.
async function failureLines(failures: EntryFailure[]): Promise<string[]> {
  const groups = new Map<string, { message: Message; keys: string[] }>()
  for (const f of failures) {
    for (const m of f.messages) {
      const loc = m.location ? `${m.location.file}:${m.location.line}:${m.location.column}` : ''
      const id = `${m.text}\0${loc}`
      const g = groups.get(id)
      if (!g) groups.set(id, { message: m, keys: [f.key] })
      else if (!g.keys.includes(f.key)) g.keys.push(f.key)
    }
  }
  if (groups.size === 0) return []
  const skipped = [...new Set(failures.map(f => f.key))].filter(k => !k.startsWith('('))
  const lines = [`[modo:bundle] ${groups.size} error(s)${skipped.length ? ` — skipped: ${skipped.join(', ')}` : ''}`]
  const color = Boolean(process.stderr.isTTY)
  for (const { message, keys } of groups.values()) {
    const [formatted] = await esbuild.formatMessages([message], { kind: 'error', color })
    lines.push((formatted ?? message.text).trimEnd(), `    in: ${keys.join(', ')}`, '')
  }
  return lines
}

function sanitize(p: string): string {
  return (
    p
      .replace(/\.(tsx?|jsx?)$/, '')
      .replace(/[^A-Za-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'module'
  )
}

/** Delete everything in outdir the last build didn't write (old hashed chunks, removed items). */
function sweep(outdir: string, keep: Set<string>, warnings: string[]): void {
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
    warnings.push(`could not clean ${relative(process.cwd(), outdir)}: ${(err as Error).message}`)
  }
}
