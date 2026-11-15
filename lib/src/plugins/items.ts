import { resolve, sep } from 'node:path'
import { isCSSRequest, normalizePath, type Plugin } from 'vite'
import { itemKey, itemPath, STATIC_PAGES, tierPath } from '../lib/paths'
import { cap } from '../lib/text'
import type { BundledItem, BundleResult, Bundler } from './bundle'
import { emitRoutes } from './static-routes'
import { unoExtractor } from './uno'
import { cssModule, reload, virtualModules } from './virtual'

interface Options {
  userRoot: string
  bundler: Bundler
}

// Markdown too (`{@include}`d .md and .mdx), and what esbuild inlines.
const SOURCE_EXT = /\.(?:[cm]?[jt]sx?|mdx?|json|svg)$/

function itemsModule({ items, scope }: BundleResult): string {
  const key = (it: BundledItem) => JSON.stringify(itemKey(it.tier, it.id))
  // Bound by index: two ids that differ only in `-`/`_` stay distinct.
  const compImports = items.map((it, i) => `import __c${i} from ${JSON.stringify(it.bundlePath)};`)
  const mdxImports = items.flatMap((it, i) =>
    it.mdxExamples.map((doc, j) => `import __x${i}_${j} from ${JSON.stringify(doc)};`),
  )
  const meta = items.map(({ id, tier, group, name, description, props, tags, path }) => ({
    id,
    tier,
    group,
    name,
    description,
    props,
    tags,
    path,
  }))
  const scopeCode = scope
    ? [
        `import * as __scope from ${JSON.stringify(scope.bundlePath)};`,
        `export const exampleScope = Object.fromEntries(Object.entries(__scope).filter(([k]) => k !== 'default'));`,
      ]
    : [`export const exampleScope = {};`]
  return [
    ...compImports,
    ...mdxImports,
    ...scopeCode,
    `export const items = ${JSON.stringify(meta)};`,
    `export const byId = Object.fromEntries(items.map(it => [it.tier + ':' + it.id, it]));`,
    `export const byName = {${items.map((it, i) => `${JSON.stringify(it.name)}: __c${i}`).join(',')}};`,
    `export const examples = {${items.map(it => `${key(it)}: ${JSON.stringify(it.examples)}`).join(',')}};`,
    `export const exampleDocs = {${items.map((it, i) => `${key(it)}: [${it.mdxExamples.map((_, j) => `__x${i}_${j}`).join(',')}]`).join(',')}};`,
  ].join('\n')
}

export function itemsPlugin(options: Options): Plugin {
  const { bundler } = options
  const modules = virtualModules('items')
  // Module ids are posix even on Windows.
  const outPrefix = `${normalizePath(bundler.outdir)}/`

  return {
    name: 'modo:items',
    enforce: 'pre',
    resolveId: modules.resolveId,
    async load(id) {
      // A build output is only read once the current build has finished
      // writing it (Vite's own fs load takes over after this).
      if (id.startsWith(outPrefix)) {
        await bundler.get()
        return null
      }
      if (id === modules.id) return itemsModule(await bundler.get())
      if (id === modules.css) return cssModule((await bundler.get()).items.flatMap(it => it.cssFiles))
      return null
    },
    generateBundle: {
      // After Vite emits index.html.
      order: 'post',
      async handler(_, bundle) {
        const { config, items, errorCount } = await bundler.get()
        // Dev keeps serving what built; a build must not ship a site with missing pages.
        if (errorCount > 0) this.error('the bundle has errors (reported above), so the site was not written')
        if (!config) return
        emitRoutes(this, bundle, config, [
          ...STATIC_PAGES,
          ...[...new Set(items.map(it => it.tier))].map(tier => ({ path: tierPath(tier).slice(1), title: cap(tier) })),
          ...items.map(it => ({
            path: itemPath(it.tier, it.id).slice(1),
            title: it.name,
            description: it.description,
          })),
        ])
      },
    },
    configureServer(s) {
      // Watch the whole project (Vite already ignores node_modules / .git):
      // items import shared code outside the tier dirs.
      s.watcher.add(options.userRoot)
      const tmp = resolve(options.userRoot, '.modo-tmp') + sep
      const extractUno = unoExtractor(s)
      let timer: ReturnType<typeof setTimeout> | null = null
      s.watcher.on('all', (event, file) => {
        if (!file.startsWith(options.userRoot + sep) || file.startsWith(tmp)) return
        // A css edit is Vite's HMR; a css file appearing or going changes
        // which files an item injects.
        const cssMoved = file.endsWith('.css') && (event === 'add' || event === 'unlink')
        if (!(SOURCE_EXT.test(file) || cssMoved) || file.includes(`${sep}node_modules${sep}`)) return
        if (event === 'add' || event === 'change') extractUno(file)
        if (timer) clearTimeout(timer)
        timer = setTimeout(() => {
          timer = null
          // Rebuild lazily: the reloaded page's virtual-module requests await
          // it. Outputs keep their names across builds, so drop Vite's cached
          // transforms of them too (.modo-tmp is not watched). Stylesheets
          // too: a scanning CSS tool (Tailwind's `@source`) rescans only when
          // its stylesheet is re-transformed, which a new file never triggers.
          bundler.invalidate()
          reload(s, id => id.startsWith('\0virtual:modo-') || id.startsWith(outPrefix) || isCSSRequest(id))
        }, 100)
      })
    },
  }
}
