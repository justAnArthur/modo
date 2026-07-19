// scans the user's project for primitive/component/block items, parses each
// one's default export with the TSDoc parser, and exposes a `virtual:modo-items`
// module that the per-item page renderers consume. the module exports:
//   - `items`:     metadata (id, category, file path, parse errors)
//   - `byId`:      TSDoc-extracted data keyed by `category/id`
//   - `components`: pre-bundled React component references keyed by `category/id`
//   - `css`:       per-item CSS strings (the user's component CSS, bundled)
//   - `examples`:  per-key map of pre-compiled example function bodies
//                  (`'primitives/button'` → `0` → body string), so the
//                  universal example-renderer can construct functions
//                  via `new Function()` without shipping esbuild to
//                  the client.
//   - `dsRoot`:    the user's project root (debug aid)
//
// esbuild is used to (a) bundle the user's item component (and its
// CSS) and (b) pre-compile each example's JSX into a function body.
// both happen in the source plugin's load() (server-only); the
// results are serialized as strings into the virtual module so the
// client never imports esbuild.

import type { Plugin } from 'vite'
import { readFile, readdir, stat, writeFile, mkdir, rm } from 'node:fs/promises'
import { readFileSync as readFileSyncFs } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import * as esbuild from 'esbuild'
import { parseItemSource } from '../../exports/tsdoc'
import { compileExampleBody } from '../components/example-compiler'

export interface SourcePluginOptions {
  root: string
}

interface DiscoveredItem {
  id: string
  category: 'primitives' | 'components' | 'blocks'
  importPath: string
  filePath: string
  hasMdx: boolean
  errors: string[]
}

async function discoverDir(dir: string, category: DiscoveredItem['category']): Promise<DiscoveredItem[]> {
  const out: DiscoveredItem[] = []
  let entries: string[] = []
  try {
    entries = await readdir(dir)
  } catch {
    return out
  }

  for (const entry of entries) {
    const fullDir = join(dir, entry)
    const s = await stat(fullDir)
    if (!s.isDirectory()) continue

    const indexPath = join(fullDir, 'index.tsx')
    const errors: string[] = []
    let raw = ''
    try {
      raw = await readFile(indexPath, 'utf-8')
    } catch {
      out.push({
        id: entry,
        category,
        importPath: '',
        filePath: fullDir,
        hasMdx: false,
        errors: [`missing ${indexPath}`],
      })
      continue
    }

    const mdxPath = join(fullDir, `${entry}.mdx`)
    let hasMdx = false
    try {
      await stat(mdxPath)
      hasMdx = true
    } catch {
      hasMdx = false
    }

    const parsed = parseItemSource(raw, indexPath)
    if (parsed.errors.length > 0) errors.push(...parsed.errors)
    if (!parsed.name) errors.push('no default-exported function with a name')

    out.push({
      id: entry,
      category,
      importPath: '/' + relative(resolve(process.cwd()), indexPath).replace(/\\/g, '/'),
      filePath: indexPath,
      hasMdx,
      errors,
    })
  }
  return out
}

const VIRTUAL_ID = 'virtual:modo-items'
const RESOLVED_VIRTUAL_ID = '\0' + VIRTUAL_ID

// one tmp dir per vite session. bundling every item into its own .mjs
// keeps the dev/build graph fully static — the virtual module becomes
// a literal `import * as ns_0 from '<abs path>'` for each item, no
// async dynamic imports, no path-arithmetic in the consumer code.
const TMP_DIR = join(
  tmpdir(),
  `modo-items-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
)

async function bundleItem(
  entryAbs: string,
  idx: number,
): Promise<{ jsPath: string; css: string } | null> {
  try {
    // bundle via entryPoints so esbuild can resolve the user's relative
    // CSS imports (`./foo.css` from within the component file). the
    // resulting CSS is a sibling output file; we collect it from
    // outputFiles and inject it via a <style> tag in the layout.
    await mkdir(TMP_DIR, { recursive: true })
    const jsPath = join(TMP_DIR, `item-${idx}.mjs`)
    const result = await esbuild.build({
      entryPoints: [entryAbs],
      bundle: true,
      write: false,
      format: 'esm',
      platform: 'neutral',
      jsx: 'automatic',
      outfile: jsPath,
      loader: { '.tsx': 'tsx', '.ts': 'ts', '.css': 'css' },
      external: ['react', 'react-dom', 'react/jsx-runtime'],
      logLevel: 'silent',
    })
    const jsFile = result.outputFiles?.find(
      (f) => f.path.endsWith('.js') || f.path.endsWith('.mjs') || f.path.endsWith('.tsx'),
    )
    if (!jsFile) return null
    await writeFile(jsPath, jsFile.text)
    const css = (result.outputFiles ?? [])
      .filter((f) => f.path.endsWith('.css'))
      .map((f) => f.text)
      .join('\n')
    return { jsPath, css }
  } catch {
    return null
  }
}

export function sourcePlugin(options: SourcePluginOptions): Plugin {
  return {
    name: 'modo-atomic-ui:source',
    enforce: 'pre',

    resolveId(id) {
      if (id === VIRTUAL_ID) return RESOLVED_VIRTUAL_ID
      return null
    },

    async load(id) {
      if (id !== RESOLVED_VIRTUAL_ID) return null

      const dsRoot = options.root
      const [primitives, components, blocks] = await Promise.all([
        discoverDir(join(dsRoot, 'primitives'), 'primitives'),
        discoverDir(join(dsRoot, 'components'), 'components'),
        discoverDir(join(dsRoot, 'blocks'), 'blocks'),
      ])
      const all = [...primitives, ...components, ...blocks]

      // second pass: read each item's source, parse TSDoc, bundle the
      // component, and pre-compile each @example into a function body.
      // results:
      //   byId      — TSDoc parse result
      //   components — static import map (the actual React components)
      //   css       — per-item CSS strings
      //   examples  — per-key map of pre-compiled example bodies
      const byId: Record<string, ReturnType<typeof parseItemSource>> = {}
      const imports: string[] = []
      const compBindings: string[] = []
      const cssBindings: string[] = []
      const exampleBindings: string[] = []
      let i = 0
      for (const item of all) {
        const key = `${item.category}/${item.id}`
        const parsed = (() => {
          try {
            const raw = readFileSyncFs(item.filePath, 'utf-8')
            byId[key] = parseItemSource(raw, item.filePath)
            return byId[key]!
          } catch {
            return undefined
          }
        })()
        const bundled = await bundleItem(item.filePath, i++)
        if (bundled) {
          imports.push(`import * as __ns_${i} from '${bundled.jsPath}';`)
          compBindings.push(`  '${key}': __ns_${i}.default ?? null,`)
        } else {
          compBindings.push(`  '${key}': null,`)
        }
        cssBindings.push(`  '${key}': ${JSON.stringify(bundled?.css ?? '')},`)
        // pre-compile each example's JSX into a function body. the
        // result is a string the client uses with `new Function()`.
        const exMap: Record<number, string> = {}
        const componentName = parsed?.name ?? item.id
        if (parsed?.examples) {
          for (let idx = 0; idx < parsed.examples.length; idx++) {
            const ex = parsed.examples[idx]!
            try {
              exMap[idx] = compileExampleBody(ex.code, componentName)
            } catch {
              exMap[idx] = ''
            }
          }
        }
        exampleBindings.push(`  '${key}': ${JSON.stringify(exMap)},`)
        i++
      }

      // best-effort cleanup of stale tmp dirs from previous vite sessions.
      // we keep the current one alive for the whole session.
      try {
        const { readdir, stat: fstat } = await import('node:fs/promises')
        for (const name of await readdir(tmpdir())) {
          if (!name.startsWith('modo-items-')) continue
          const p = join(tmpdir(), name)
          if (p === TMP_DIR) continue
          try {
            const s = await fstat(p)
            if (s.isDirectory() && Date.now() - s.mtimeMs > 60_000) {
              await rm(p, { recursive: true, force: true }).catch(() => {})
            }
          } catch { /* gone */ }
        }
      } catch { /* noop */ }

      return [
        ...imports,
        `export const items = ${JSON.stringify(all, null, 2)};`,
        `export const byId = ${JSON.stringify(byId, null, 2)};`,
        `export const dsRoot = ${JSON.stringify(dsRoot)};`,
        `export const components = {\n${compBindings.join('\n')}\n};`,
        `export const css = {\n${cssBindings.join('\n')}\n};`,
        `export const examples = {\n${exampleBindings.join('\n')}\n};`,
      ].join('\n')
    },

    async handleHotUpdate(ctx) {
      const dsRoot = resolve(options.root)
      if (ctx.file.startsWith(dsRoot)) {
        const mod = (this as any).environment?.moduleGraph?.getModuleById?.(RESOLVED_VIRTUAL_ID)
        if (mod) mod.invalidate?.()
        return []
      }
      return
    },
  }
}
