import type { Plugin } from 'vite'
import { guidePath } from '../lib/paths'
import type { BundleResult, Bundler } from './bundle'
import { emitRoutes } from './static-routes'
import { virtualModules } from './virtual'

// The guides are entries of the shared build, so the items plugin's watcher
// already rebuilds and reloads when one is added, edited or removed.

function guidesModule({ guides }: BundleResult): string {
  return [
    ...guides.map((guide, i) => `import __g${i} from ${JSON.stringify(guide.bundlePath)};`),
    `export const guides = [${guides
      .map(
        ({ slug, group, title, description }, i) =>
          `{...${JSON.stringify({ slug, group, title, description })}, Component: __g${i}}`,
      )
      .join(',')}];`,
  ].join('\n')
}

export function guidesPlugin({ bundler }: { bundler: Bundler }): Plugin {
  const modules = virtualModules('guides')
  return {
    name: 'modo:guides',
    enforce: 'pre',
    resolveId: modules.resolveId,
    async load(id) {
      return id === modules.id ? guidesModule(await bundler.get()) : null
    },
    generateBundle: {
      // After Vite emits index.html.
      order: 'post',
      async handler(_, bundle) {
        const { config, guides } = await bundler.get()
        if (!config) return
        emitRoutes(
          this,
          bundle,
          config,
          guides.map(({ slug, title, description }) => ({ path: guidePath(slug).slice(1), title, description })),
        )
      },
    },
  }
}
