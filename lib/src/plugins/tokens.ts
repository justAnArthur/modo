import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { resolve, sep } from 'node:path'
import type { Plugin } from 'vite'
import { buildGroup, GROUPS, type Group, parseTokenFile } from '../lib/css'
import { tokenPath } from '../lib/paths'
import { cap } from '../lib/text'
import { loadModoConfig } from '../node/config-loader'
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

function readTokens(userRoot: string): Tokens {
  const dir = resolve(userRoot, 'tokens')
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
  let cache: Tokens | null = null
  const tokens = () => (cache ??= readTokens(options.userRoot))

  return {
    name: 'modo:tokens',
    enforce: 'pre',
    resolveId: modules.resolveId,
    load(id) {
      if (id === modules.id) return `export const tokens = ${JSON.stringify(tokens().groups)};`
      if (id === modules.css) return cssModule(tokens().cssFiles)
      return null
    },
    generateBundle: {
      // After Vite emits index.html.
      order: 'post',
      async handler(_, bundle) {
        emitRoutes(this, bundle, await loadModoConfig(options.configPath), [
          { path: tokenPath().slice(1), title: 'Foundations' },
          ...tokens().groups.map(g => ({ path: tokenPath(g.name).slice(1), title: cap(g.name) })),
        ])
      },
    },
    configureServer(server) {
      const dir = resolve(options.userRoot, 'tokens') + sep
      // The pages read parsed values, so a token edit reloads them; Vite's
      // css HMR alone would leave the numbers stale.
      server.watcher.on('all', (_event, file) => {
        if (!file.startsWith(dir) || !file.endsWith('.css')) return
        cache = null
        reload(server, id => id === modules.id || id === modules.css)
      })
    },
  }
}
