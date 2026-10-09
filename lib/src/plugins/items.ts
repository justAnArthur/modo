import { resolve, sep } from 'node:path'
import { normalizePath, type Plugin } from 'vite'
import type { Bundler } from './bundle'
import { cssModule } from './css-module'
import { emitRoutes } from './static-routes'

interface Options {
  userRoot: string
  bundler: Bundler
}

const ITEMS_VIRTUAL = 'virtual:modo-items'
const ITEMS_RESOLVED = '\0virtual:modo-items'
const ITEMS_CSS_VIRTUAL = 'virtual:modo-items-css'
const ITEMS_CSS_RESOLVED = '\0virtual:modo-items-css'

// Markdown too (`{@include}`d .md and .mdx), and what esbuild inlines.
const SOURCE_EXT = /\.(?:[cm]?[jt]sx?|mdx?|json|svg)$/

export function itemsPlugin(options: Options): Plugin {
  const { bundler } = options
  // Module ids are posix even on Windows.
  const outPrefix = `${normalizePath(bundler.outdir)}/`

  return {
    name: 'modo:items',
    enforce: 'pre',
    async resolveId(id) {
      if (id === ITEMS_VIRTUAL) return ITEMS_RESOLVED
      if (id === ITEMS_CSS_VIRTUAL) return ITEMS_CSS_RESOLVED
      return null
    },
    async load(id) {
      // A build output is only read once the current build has finished
      // writing it (Vite's own fs load takes over after this).
      if (id.startsWith(outPrefix)) {
        await bundler.get()
        return null
      }

      if (id === ITEMS_RESOLVED) {
        const { items, scope } = await bundler.get()
        const key = (it: { tier: string; id: string }) => JSON.stringify(`${it.tier}:${it.id}`)
        // Bound by index: two ids that differ only in `-`/`_` stay distinct.
        const compImports = items.map((it, i) => `import __c${i} from ${JSON.stringify(it.bundlePath)};`)
        const docImports = items.flatMap((it, i) =>
          it.exampleDocs.map((doc, j) => `import __x${i}_${j} from ${JSON.stringify(doc)};`),
        )
        const meta = items.map(({ id, tier, group, name, description, props }) => ({
          id,
          tier,
          group,
          name,
          description,
          props,
        }))
        // Named exports of the `examples` module, in scope in every example.
        const scopeCode = scope
          ? [
              `import * as __scope from ${JSON.stringify(scope.bundlePath)};`,
              `export const exampleScope = Object.fromEntries(Object.entries(__scope).filter(([k]) => k !== 'default'));`,
            ]
          : [`export const exampleScope = {};`]
        return [
          ...compImports,
          ...docImports,
          ...scopeCode,
          `export const items = ${JSON.stringify(meta)};`,
          `export const byId = Object.fromEntries(items.map(it => [it.tier + ':' + it.id, it]));`,
          `export const byName = {${items.map((it, i) => `${JSON.stringify(it.name)}: __c${i}`).join(',')}};`,
          `export const examples = {${items.map(it => `${key(it)}: ${JSON.stringify(it.examples)}`).join(',')}};`,
          `export const exampleDocs = {${items.map((it, i) => `${key(it)}: [${it.exampleDocs.map((_, j) => `__x${i}_${j}`).join(',')}]`).join(',')}};`,
        ].join('\n')
      }
      if (id === ITEMS_CSS_RESOLVED) {
        const { items } = await bundler.get()
        return cssModule(items.flatMap(it => it.cssFiles))
      }
      return null
    },
    generateBundle: {
      // After Vite emits index.html.
      order: 'post',
      async handler(_, bundle) {
        const { items } = await bundler.get()
        emitRoutes(this, bundle, [
          ...new Set(items.map(it => `docs/${it.tier}`)),
          ...items.map(it => `docs/${it.tier}/${it.id}`),
        ])
      },
    },
    configureServer(s) {
      // Watch the whole project (Vite already ignores node_modules / .git):
      // items import shared code outside the tier dirs.
      s.watcher.add(options.userRoot)
      const tmp = resolve(options.userRoot, '.modo-tmp') + sep
      let timer: ReturnType<typeof setTimeout> | null = null
      s.watcher.on('all', (event, file) => {
        if (!file.startsWith(options.userRoot + sep) || file.startsWith(tmp)) return
        // A css edit is Vite's HMR; a css file appearing or going changes
        // which files an item injects.
        const cssMoved = file.endsWith('.css') && (event === 'add' || event === 'unlink')
        if (!(SOURCE_EXT.test(file) || cssMoved) || file.includes(`${sep}node_modules${sep}`)) return
        if (timer) clearTimeout(timer)
        timer = setTimeout(() => {
          timer = null
          // Rebuild lazily: the reloaded page's virtual-module requests await
          // it. Outputs keep their names across builds, so drop Vite's cached
          // transforms of them too (.modo-tmp is not watched).
          bundler.invalidate()
          for (const [id, mod] of s.moduleGraph.idToModuleMap) {
            if (id.startsWith('\0virtual:modo-') || id.startsWith(outPrefix)) s.moduleGraph.invalidateModule(mod)
          }
          s.ws.send({ type: 'full-reload' })
        }, 100)
      })
    },
  }
}
