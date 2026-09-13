import type { Plugin } from 'vite'
import { existsSync, readdirSync, readFileSync, statSync, mkdirSync } from 'node:fs'
import { resolve, join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { randomUUID } from 'node:crypto'
import { parseItemSource, type ParsedItem, type ParsedExample } from '../lib/tsdoc'
import { discoverCssForFile } from '../lib/discover-css'
import esbuild from 'esbuild'

interface Options {
  userRoot: string
}

const ITEMS_VIRTUAL = 'virtual:modo-items'
const ITEMS_RESOLVED = '\0virtual:modo-items'
const ITEMS_CSS_VIRTUAL = 'virtual:modo-items-css'
const ITEMS_CSS_RESOLVED = '\0virtual:modo-items-css'

type Tier = 'primitives' | 'components' | 'blocks'

interface BundledItem {
  id: string
  tier: Tier
  name: string
  description: string
  props: ParsedItem['props']
  examples: ParsedExample[]
  Component: unknown
  cssFiles: string[]
  bundlePath: string
}

interface ParsedItemsResult {
  items: BundledItem[]
  errors: string[]
}

function tmpDir(root: string): string {
  return resolve(root, '.modo-tmp')
}

function ensureTmpDir(root: string): string {
  const dir = tmpDir(root)
  mkdirSync(dir, { recursive: true })
  return dir
}

async function discoverAndBundle(userRoot: string): Promise<ParsedItemsResult> {
  const errors: string[] = []
  const items: BundledItem[] = []
  const tiers: Tier[] = ['primitives', 'components', 'blocks']

  for (const tier of tiers) {
    const tierDir = resolve(userRoot, tier)
    if (!existsSync(tierDir)) continue
    for (const entry of readdirSync(tierDir)) {
      const itemDir = resolve(tierDir, entry)
      if (!statSync(itemDir).isDirectory()) continue
      const tsxFile = resolve(itemDir, 'index.tsx')
      if (!existsSync(tsxFile)) continue
      const parsed = parseItemSource(readFileSync(tsxFile, 'utf8'))
      if (parsed.errors.length > 0) {
        errors.push(`${tier}/${entry}: ${parsed.errors.join('; ')}`)
      }
      const cssFiles = discoverCssForFile(tsxFile)
      const dir = ensureTmpDir(userRoot)
      const outFile = join(dir, `${tier}-${entry}-${randomUUID()}.mjs`)
      try {
        await esbuild.build({
          entryPoints: [tsxFile],
          bundle: true,
          format: 'esm',
          outfile: outFile,
          platform: 'neutral',
          target: 'es2022',
          external: ['react', 'react-dom', 'react/jsx-runtime', 'react/jsx-dev-runtime'],
          loader: { '.ts': 'ts', '.tsx': 'tsx', '.css': 'empty', '.svg': 'dataurl' },
          jsx: 'automatic',
          jsxImportSource: 'react',
          logLevel: 'silent',
        })
        const mod = (await import(pathToFileURL(outFile).href + `?id=${entry}&t=${Date.now()}`)) as {
          default?: unknown
        }
        items.push({
          id: entry,
          tier,
          name: parsed.name || entry,
          description: parsed.description,
          props: parsed.props,
          examples: parsed.examples,
          Component: (mod.default ?? mod) as unknown,
          cssFiles,
          bundlePath: outFile,
        })
      } catch (err) {
        errors.push(`${tier}/${entry}: bundle failed — ${(err as Error).message}`)
      }
    }
  }
  return { items, errors }
}

export function itemsPlugin(options: Options): Plugin {
  let cache: ParsedItemsResult | null = null
  let cachePromise: Promise<ParsedItemsResult> | null = null

  function getCache(): Promise<ParsedItemsResult> {
    if (cache) return Promise.resolve(cache)
    if (cachePromise) return cachePromise
    cachePromise = discoverAndBundle(options.userRoot).then((result) => {
      cache = result
      cachePromise = null
      return result
    })
    return cachePromise
  }

  return {
    name: 'modo:items',
    enforce: 'pre',
    async resolveId(id) {
      if (id === ITEMS_VIRTUAL) return ITEMS_RESOLVED
      if (id === ITEMS_CSS_VIRTUAL) return ITEMS_CSS_RESOLVED
      return null
    },
    async load(id) {
      const safe = (s: string) => s.replace(/[^A-Za-z0-9_]/g, '_')
      const safeId = (it: { id: string; tier: Tier }) => `__COMP_${safe(it.id)}_${safe(it.tier)}`

      if (id === ITEMS_RESOLVED) {
        const { items } = await getCache()
        const compImports = items
          .map((it, idx) => {
            const ident = safeId(it)
            return `import __c${idx} from ${JSON.stringify(it.bundlePath)};\nconst ${ident} = (__c${idx} && (__c${idx}.default ?? __c${idx}));`
          })
          .join('\n')
        const itemsJson = items.map((it) => `${JSON.stringify(it.id)}: ${safeId(it)}`).join(',')
        const byIdJson = items
          .map((it) => {
            const ident = safeId(it)
            return `${JSON.stringify(`${it.tier}:${it.id}`)}: { id: ${JSON.stringify(it.id)}, tier: ${JSON.stringify(it.tier)}, name: ${JSON.stringify(it.name)}, description: ${JSON.stringify(it.description)}, props: ${JSON.stringify(it.props)}, Component: ${ident} }`
          })
          .join(',')
        const serializedJson = JSON.stringify(
          items.map((it) => ({ id: it.id, tier: it.tier, name: it.name, description: it.description, props: it.props })),
        )
        const examplesJson = items
          .map((it) => `${JSON.stringify(`${it.tier}:${it.id}`)}: ${JSON.stringify(it.examples)}`)
          .join(',')
        const propsJson = items
          .map((it) => `${JSON.stringify(`${it.tier}:${it.id}`)}: ${JSON.stringify(it.props)}`)
          .join(',')
        const byNameJson = items
          .map((it) => `${JSON.stringify(it.name)}: ${safeId(it)}`)
          .join(',')
        const rebuild = [
          `export const items = ${serializedJson};`,
          `export const byId = {${byIdJson}};`,
          `export const components = {${itemsJson}};`,
          `export const byName = {${byNameJson}};`,
          `export const primitives = byName;`,
          `export const examples = {${examplesJson}};`,
          `export const props = {${propsJson}};`,
        ].join('\n')
        return [compImports, rebuild].join('\n')
      }
      if (id === ITEMS_CSS_RESOLVED) {
        const { items } = await getCache()
        const cssFiles = items.flatMap((it) => it.cssFiles)
        const imports = cssFiles.map((f) => `import ${JSON.stringify(f)};`).join('\n')
        return [imports, `export default '';`].join('\n')
      }
      return null
    },
    configureServer(server) {
      const watchGlobs = ['primitives', 'components', 'blocks'].map((t) => resolve(options.userRoot, t))
      for (const g of watchGlobs) server.watcher.add(g)
    },
  }
}
