import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import mdx from '@mdx-js/esbuild'
import type { Plugin as EsbuildPlugin } from 'esbuild'
import remarkFrontmatter from 'remark-frontmatter'
import remarkGfm from 'remark-gfm'
import remarkMdxFrontmatter from 'remark-mdx-frontmatter'
import type { Plugin } from 'vite'
import { type DiscoveredPage, discoverPages } from '../lib/discover-pages'
import type { SiteConfig } from '../lib/schema'
import type { Bundler } from './bundle'
import { remarkModoExamples } from './mdx-examples'
import { emitRoutes } from './static-routes'

// Free-form `.mdx` pages are entries of the shared build (./bundle), so they
// import items and share their contexts. The bundler discovers them through
// `pageEntries`; the last discovery is what `pagesMdx` compiles and what
// `virtual:modo-pages` lists.
let current: Array<DiscoveredPage & { key: string }> = []
let lastSkipped = ''

/**
 * Adds the pages to the bundle's entries through its `keyFor` (`pages/<slug>`
 * → its `.mdx`), keeping the key it settles on: a file already an entry keeps its own.
 */
export function pageEntries(
  userRoot: string,
  config: SiteConfig | null,
  keyFor: (file: string, key: string) => string,
): void {
  const { pages, skipped } = discoverPages(resolve(userRoot, config?.pages ?? 'pages'))
  current = pages.map(page => ({ ...page, key: keyFor(page.file, `pages/${page.slug}`) }))
  const report = skipped.join(', ')
  // The bundler reruns on every source change; say it once.
  if (report && report !== lastSkipped) {
    process.stderr.write(`[modo:pages] warning: skipped ${report} (a docs/ slug or one already taken)\n`)
  }
  lastSkipped = report
}

const compile = mdx({
  remarkPlugins: [remarkGfm, remarkFrontmatter, [remarkMdxFrontmatter, { default: {} }], remarkModoExamples],
  jsxImportSource: 'react',
})

/**
 * Compiles the pages' MDX, frontmatter included (`export const frontmatter`),
 * ahead of the examples' compiler, which never sees frontmatter.
 */
export const pagesMdx: EsbuildPlugin = {
  name: 'modo:pages-mdx',
  setup: build =>
    compile.setup({
      ...build,
      onLoad: (options, onLoad) =>
        build.onLoad(options, args => (current.some(page => page.file === args.path) ? onLoad(args) : undefined)),
    }),
}

const VIRTUAL = 'virtual:modo-pages'
const RESOLVED = '\0virtual:modo-pages'

export function pagesPlugin({ bundler }: { bundler: Bundler }): Plugin {
  // A page that failed to build has no output (the bundler reports it).
  const built = async () => {
    await bundler.get()
    return current
      .map(page => ({ ...page, bundlePath: resolve(bundler.outdir, `${page.key}.mjs`) }))
      .filter(page => existsSync(page.bundlePath))
  }

  return {
    name: 'modo:pages',
    enforce: 'pre',
    resolveId: id => (id === VIRTUAL ? RESOLVED : null),
    async load(id) {
      if (id !== RESOLVED) return null
      const pages = await built()
      return [
        ...pages.map((page, i) => `import * as __p${i} from ${JSON.stringify(page.bundlePath)};`),
        `export const pages = [${pages
          .map(
            ({ slug, group }, i) =>
              `{ ...${JSON.stringify({ slug, group })}, frontmatter: __p${i}.frontmatter, Component: __p${i}.default }`,
          )
          .join(',')}];`,
      ].join('\n')
    },
    generateBundle: {
      // After Vite emits index.html; `index` is the home page.
      order: 'post',
      async handler(_, bundle) {
        const pages = await built()
        emitRoutes(
          this,
          bundle,
          pages.filter(page => page.slug !== 'index').map(page => page.slug),
        )
      },
    },
  }
}
