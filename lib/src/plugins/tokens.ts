import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { resolve, sep } from 'node:path'
import type { Plugin } from 'vite'
import { buildGroup, GROUPS, type Group, type GroupName, parseCss, prefixGroup } from '../lib/css'
import { cssModule } from './css-module'
import { emitRoutes } from './static-routes'

interface Options {
  userRoot: string
}

const TOKENS_VIRTUAL = 'virtual:modo-tokens'
const TOKENS_RESOLVED = '\0virtual:modo-tokens'
const TOKENS_CSS_VIRTUAL = 'virtual:modo-tokens-css'
const TOKENS_CSS_RESOLVED = '\0virtual:modo-tokens-css'

interface ParsedTokensResult {
  groups: Group[]
  cssFiles: string[]
}

function parseTokens(userRoot: string): ParsedTokensResult {
  const tokensDir = resolve(userRoot, 'tokens')
  const cssFiles: string[] = []
  const byGroup = new Map<GroupName, ReturnType<typeof parseCss>>()
  for (const g of GROUPS) byGroup.set(g, [])
  if (!existsSync(tokensDir)) return { groups: [], cssFiles }
  // Sorted: the files' import order is the cascade order.
  for (const entry of readdirSync(tokensDir).sort()) {
    if (!entry.endsWith('.css')) continue
    const file = resolve(tokensDir, entry)
    const base = entry.replace(/\.css$/i, '').toLowerCase()
    const group = (GROUPS as readonly string[]).includes(base) ? (base as GroupName) : null
    const src = readFileSync(file, 'utf8')
    cssFiles.push(file)
    // A file named for a group owns its unprefixed vars (ui's `--sm` in
    // spacing.css); a var whose name claims another group goes there.
    for (const v of parseCss(src)) {
      const g = group ? (prefixGroup(v.name) ?? group) : v.group
      byGroup.get(g)!.push({ ...v, group: g })
    }
  }
  const groups = GROUPS.map(g => buildGroup(g, byGroup.get(g)!)).filter(g => g.vars.length > 0)
  return { groups, cssFiles }
}

export function tokensPlugin(options: Options): Plugin {
  let cache: ParsedTokensResult | null = null

  function getCache(): ParsedTokensResult {
    if (!cache) cache = parseTokens(options.userRoot)
    return cache
  }

  return {
    name: 'modo:tokens',
    enforce: 'pre',
    resolveId(id) {
      if (id === TOKENS_VIRTUAL) return TOKENS_RESOLVED
      if (id === TOKENS_CSS_VIRTUAL) return TOKENS_CSS_RESOLVED
      return null
    },
    load(id) {
      if (id === TOKENS_RESOLVED) {
        return `export const tokens = ${JSON.stringify(getCache().groups)};`
      }
      if (id === TOKENS_CSS_RESOLVED) {
        const { cssFiles } = getCache()
        return cssModule(cssFiles)
      }
      return null
    },
    generateBundle: {
      // After Vite emits index.html.
      order: 'post',
      handler(_, bundle) {
        emitRoutes(this, bundle, ['docs/tokens', ...getCache().groups.map(g => `docs/tokens/${g.name}`)])
      },
    },
    configureServer(server) {
      const dir = resolve(options.userRoot, 'tokens') + sep
      // The pages read parsed values, so a token edit reloads them; Vite's
      // css HMR alone would leave the numbers stale.
      server.watcher.on('all', (_event, file) => {
        if (!file.startsWith(dir) || !file.endsWith('.css')) return
        cache = null
        for (const id of [TOKENS_RESOLVED, TOKENS_CSS_RESOLVED]) {
          const mod = server.moduleGraph.getModuleById(id)
          if (mod) server.moduleGraph.invalidateModule(mod)
        }
        server.ws.send({ type: 'full-reload' })
      })
    },
  }
}
