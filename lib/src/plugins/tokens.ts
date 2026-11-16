import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { resolve, sep } from 'node:path'
import type { Plugin } from 'vite'
import { buildGroup, GROUPS, type Group, parseTokenFile } from '../lib/css'
import { tokenPath } from '../lib/paths'
import { cap } from '../lib/text'
import { loadModoConfig } from '../node/config-loader'
import { itemsRootOf } from '../node/discover'
import { emitRoutes } from './static-routes'
import { cssModule, reload, virtualModules } from './virtual'

interface Options {
  userRoot: string
  configPath: string
}

interface Tokens {
  groups: Group[]
  cssFiles: string[]
}

// configPlugin reports a broken config; tokens then fall back to the project root.
async function tokensDirOf({ userRoot, configPath }: Options): Promise<string> {
  const config = await loadModoConfig(configPath).catch(() => null)
  return resolve(itemsRootOf(userRoot, config), 'tokens')
}

function readTokens(dir: string): Tokens {
  if (!existsSync(dir)) return { groups: [], cssFiles: [] }
  // Sorted: the files' import order is the cascade order.
  const cssFiles = readdirSync(dir)
    .sort()
    .filter(f => f.endsWith('.css'))
    .map(f => resolve(dir, f))
  const all = cssFiles.flatMap(file => parseTokenFile(readFileSync(file, 'utf8'), file.slice(dir.length + 1)))
  const groups = GROUPS.map(g =>
    buildGroup(
      g,
      all.filter(v => v.group === g),
      all,
    ),
  ).filter(g => g.vars.length > 0)
  return { groups, cssFiles }
}

export function tokensPlugin(options: Options): Plugin {
  const modules = virtualModules('tokens')
  let cache: Promise<Tokens> | null = null
  const tokens = () => (cache ??= tokensDirOf(options).then(readTokens))

  return {
    name: 'modo:tokens',
    enforce: 'pre',
    resolveId: modules.resolveId,
    async load(id) {
      if (id === modules.id) return `export const tokens = ${JSON.stringify((await tokens()).groups)};`
      if (id === modules.css) return cssModule((await tokens()).cssFiles)
      return null
    },
    generateBundle: {
      // After Vite emits index.html.
      order: 'post',
      async handler(_, bundle) {
        emitRoutes(this, bundle, await loadModoConfig(options.configPath), [
          { path: tokenPath().slice(1), title: 'Foundations' },
          ...(await tokens()).groups.map(g => ({ path: tokenPath(g.name).slice(1), title: cap(g.name) })),
        ])
      },
    },
    configureServer(server) {
      // The pages read parsed values, so a token edit reloads them; Vite's
      // css HMR alone would leave the numbers stale.
      server.watcher.on('all', async (_event, file) => {
        if (!file.endsWith('.css') || !file.startsWith((await tokensDirOf(options)) + sep)) return
        cache = null
        reload(server, id => id === modules.id || id === modules.css)
      })
    },
  }
}
