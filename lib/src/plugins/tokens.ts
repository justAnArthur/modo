import type { Plugin } from 'vite'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { parseCss, buildGroup, GROUPS, type Group, type GroupName } from '../lib/css'

interface Options {
  userRoot: string
}

const TOKENS_VIRTUAL = 'virtual:modo-tokens'
const TOKENS_RESOLVED = '\0virtual:modo-tokens'
const TOKENS_CSS_VIRTUAL = 'virtual:modo-tokens-css'
const TOKENS_CSS_RESOLVED = '\0virtual:modo-tokens-css'


interface ParsedTokensResult {
  groups: Group[]
  errors: string[]
  cssFiles: string[]
}

function parseTokens(userRoot: string): ParsedTokensResult {
  const tokensDir = resolve(userRoot, 'tokens')
  const errors: string[] = []
  const cssFiles: string[] = []
  const byGroup = new Map<GroupName, ReturnType<typeof parseCss>>()
  for (const g of GROUPS) byGroup.set(g, [])
  if (!existsSync(tokensDir)) return { groups: [], errors, cssFiles }
  for (const entry of readdirSync(tokensDir)) {
    if (!entry.endsWith('.css')) continue
    const file = resolve(tokensDir, entry)
    const base = entry.replace(/\.css$/i, '').toLowerCase()
    const group = (GROUPS as readonly string[]).includes(base) ? (base as GroupName) : null
    const src = readFileSync(file, 'utf8')
    cssFiles.push(file)
    const parsed = parseCss(src)
    if (group) {
      byGroup.get(group)!.push(...parsed.filter((p) => p.group === group))
    } else {
      for (const v of parsed) {
        byGroup.get(v.group)!.push(v)
      }
    }
  }
  const groups = GROUPS.map((g) => buildGroup(g, byGroup.get(g)!)).filter((g) => g.vars.length > 0)
  return { groups, errors, cssFiles }
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
        const { groups, errors } = getCache()
        return [
          `export const tokens = ${JSON.stringify(groups)};`,
          `export const errors = ${JSON.stringify(errors)};`,
          `export default tokens;`,
        ].join('\n')
      }
      if (id === TOKENS_CSS_RESOLVED) {
        const { cssFiles } = getCache()
        const imports = cssFiles.map((f) => `import ${JSON.stringify(f)};`).join('\n')
        return [imports, `export default '';`].join('\n')
      }
      return null
    },
    configureServer(server) {
      server.watcher.add(resolve(options.userRoot, 'tokens'))
    },
  }
}
