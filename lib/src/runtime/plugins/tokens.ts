// parses design tokens from CSS files in the user's project. the user writes
// one or more `.css` files in `tokens/` with custom properties:
//
//   /* tokens/colors.css */
//   :root {
//     --surface-1: #fafafa;
//     --foreground: #171717;
//     --border: color-mix(in oklab, #18181b 10%, transparent);
//   }
//
//   /* tokens/spacing.css */
//   :root {
//     --xxs: 2px;
//     --sm: 8px;
//   }
//
// the plugin infers the group from the filename (tokens/colors.css → colors)
// or, for a single tokens.css / tokens/index.css, from the variable prefix
// (--space-* → spacing, --motion-* → motion, etc.) with optional section
// comments as overrides (`/* @group colors */`).
//
// the plugin exposes two virtual modules:
//   - virtual:modo-tokens       : { tokens, errors } — structured data
//                                 consumed by the docs data tables
//   - virtual:modo-tokens-css   : a side-effect import of each discovered
//                                 CSS file. Vite injects them as real
//                                 <link>/<style> tags — the user's source
//                                 CSS is loaded once, no synthesis, no
//                                 re-emission.

import type { Plugin, ViteDevServer } from 'vite'
import { readFile, readdir } from 'node:fs/promises'
import { join, basename, extname } from 'node:path'
import { GROUPS, type Group, type ParsedVar, parseCss, buildGroup, groupForVar } from '../../exports/css-parser'

export interface TokensPluginOptions {
  root: string
}

interface DiscoveredGroup {
  name: string
  raw: unknown
  errors: string[]
}

interface TokensDiscovery {
  groups: DiscoveredGroup[]
  errors: string[]
  cssFiles: string[]
}

async function discoverTokens(root: string): Promise<TokensDiscovery> {
  const errors: string[] = []
  const tokensDir = join(root, 'tokens')
  const files: string[] = []
  try {
    const all = await readdir(tokensDir)
    for (const f of all) if (extname(f) === '.css') files.push(f)
  } catch {
    errors.push(`tokens directory not found at ${tokensDir}`)
    return { groups: [], errors, cssFiles: [] }
  }

  const cssFiles = files.map((f) => join(tokensDir, f))

  // 1. collect every --var from every .css file, tagged with the file's
  //    group (from filename) or null (single-file mode).
  type Tagged = { var: ParsedVar; fileGroup: Group | null }
  const all: Tagged[] = []
  for (const file of files) {
    const stem = basename(file, '.css')
    const fileGroup: Group | null = (GROUPS as readonly string[]).includes(stem) ? (stem as Group) : null
    const src = await readFile(join(tokensDir, file), 'utf-8')
    for (const v of parseCss(src)) {
      all.push({ var: v, fileGroup })
    }
  }

  // 2. group by group name. file-level groups (tokens/colors.css) are
  //    authoritative; otherwise infer from prefix.
  const byGroup: Record<string, ParsedVar[]> = {}
  for (const { var: v, fileGroup } of all) {
    const g = fileGroup ?? groupForVar(v.name)
    if (!g) {
      errors.push(`could not infer group for --${v.name} (no prefix match and file is not group-named)`)
      continue
    }
    if (!byGroup[g]) byGroup[g] = []
    byGroup[g]!.push(v)
  }

  // 3. assemble each group with the same shape the old plugin produced.
  const groups: DiscoveredGroup[] = []
  for (const name of GROUPS) {
    const vars = byGroup[name]
    if (!vars || vars.length === 0) continue
    groups.push({ name, raw: buildGroup(name, vars), errors: [] })
  }

  return { groups, errors, cssFiles }
}

function buildDataModule(groups: DiscoveredGroup[], errors: string[]): string {
  const tokensByName: Record<string, unknown> = {}
  for (const g of groups) tokensByName[g.name] = g.raw
  return [
    `export const tokens = ${JSON.stringify(tokensByName)};`,
    `export const errors = ${JSON.stringify(errors)};`,
  ].join('\n')
}

function buildCssModule(cssFiles: string[]): string {
  // side-effect imports of each discovered token file. Vite walks
  // these and injects them as <link>/<style> tags in the right order.
  // sort for stable output (the user can override an earlier token by
  // declaring it in a file that sorts later; alphabetical is fine).
  return [...cssFiles].sort().map((f) => `import ${JSON.stringify(f)};`).join('\n') + '\n'
}

const VIRTUAL_DATA = 'virtual:modo-tokens'
const VIRTUAL_CSS = 'virtual:modo-tokens-css'
const RESOLVED_DATA = '\0' + VIRTUAL_DATA
const RESOLVED_CSS = '\0' + VIRTUAL_CSS

export function tokensPlugin(options: TokensPluginOptions): Plugin {
  let server: ViteDevServer | null = null

  return {
    name: 'modo-atomic-ui:tokens',
    enforce: 'pre',

    resolveId(id) {
      if (id === VIRTUAL_DATA) return RESOLVED_DATA
      if (id === VIRTUAL_CSS) return RESOLVED_CSS
      return null
    },

    async load(id) {
      if (id !== RESOLVED_DATA && id !== RESOLVED_CSS) return null
      const { groups, errors, cssFiles } = await discoverTokens(options.root)
      if (id === RESOLVED_DATA) return buildDataModule(groups, errors)
      return buildCssModule(cssFiles)
    },

    configureServer(s) {
      server = s
      // token CSS files live in the user's project — same caveat as the
      // source plugin: vite's default chokidar doesn't watch them.
      s.watcher.add(join(options.root, 'tokens'))
    },

    async handleHotUpdate(ctx) {
      if (!ctx.file.startsWith(join(options.root, 'tokens'))) return
      // invalidate so `load()` re-runs and re-parses the CSS files.
      const data = server?.moduleGraph.getModuleById(RESOLVED_DATA)
      const css = server?.moduleGraph.getModuleById(RESOLVED_CSS)
      if (data) server!.moduleGraph.invalidateModule(data)
      if (css)  server!.moduleGraph.invalidateModule(css)
      // virtual modules are server-side only — force a full page reload
      // via the HMR WebSocket so the client picks up the new tokens.
      server!.environments.client.hot.send({
        type: 'full-reload',
        path: '*',
        triggeredBy: ctx.file,
      })
      return []
    },
  }
}
