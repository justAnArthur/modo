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
// output is `virtual:modo-tokens` with the same shape the old TS-based
// plugin produced: `tokens.<group>` for each group, `errors` for issues,
// and `css` for the `:root { ... }` block the renderer injects.

import type { Plugin, ViteDevServer } from 'vite'
import { readFile, readdir } from 'node:fs/promises'
import { join, basename, extname } from 'node:path'
import { GROUPS, type Group, type ParsedVar, parseCss, groupForVar, buildGroup } from '../../exports/css-parser'

export interface TokensPluginOptions {
  root: string
}

interface DiscoveredGroup {
  name: string
  raw: unknown
  errors: string[]
}

async function discoverTokens(root: string): Promise<{ groups: DiscoveredGroup[]; errors: string[] }> {
  const errors: string[] = []
  const tokensDir = join(root, 'tokens')
  let files: string[] = []
  try {
    files = await readdir(tokensDir)
  } catch {
    errors.push(`tokens directory not found at ${tokensDir}`)
    return { groups: [], errors }
  }

  // 1. collect every --var from every .css file, tagged with the file's
  //    group (from filename) or null (single-file mode).
  type Tagged = { var: ParsedVar; fileGroup: Group | null }
  const all: Tagged[] = []
  for (const file of files) {
    if (extname(file) !== '.css') continue
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
  // the 'surfaces' group is always synthesized (1..8 levels, each with
  // bg + shadow refs) — even if the user didn't write a surfaces.css.
  const groups: DiscoveredGroup[] = []
  for (const name of GROUPS) {
    if (name === 'surfaces') {
      groups.push({ name, raw: buildGroup('surfaces', []), errors: [] })
      continue
    }
    const vars = byGroup[name]
    if (!vars || vars.length === 0) continue
    groups.push({ name, raw: buildGroup(name, vars), errors: [] })
  }

  return { groups, errors }
}

// ── :root block generation (for the renderer) ────────────────────────

function buildCss(groups: DiscoveredGroup[]): string {
  const lines: string[] = [':root {']
  for (const g of groups) {
    const data = g.raw as Record<string, unknown>
    if (g.name === 'colors' && data.items) {
      const items = data.items as Record<string, { value: string }>
      for (const [name, tok] of Object.entries(items)) {
        lines.push(`  --${name.replace(/_/g, '-')}: ${tok.value};`)
      }
    } else if (g.name === 'surfaces' && data.levels) {
      const levels = data.levels as Record<string, { bg: string; shadow: string }>
      for (const [n, lvl] of Object.entries(levels)) {
        lines.push(`  --surface-${n}: var(--${lvl.bg.replace(/_/g, '-')});`)
        lines.push(`  --shadow-${n}: var(--${lvl.shadow.replace(/_/g, '-')});`)
      }
    } else if (g.name === 'typography' && data.families) {
      const families = data.families as Record<string, string>
      for (const [name, value] of Object.entries(families)) {
        lines.push(`  --font-${name}: ${value};`)
      }
    } else if (g.name === 'spacing' && data.scale) {
      const scale = data.scale as Record<string, { value: string }>
      for (const [name, tok] of Object.entries(scale)) {
        lines.push(`  --space-${name.replace(/_/g, '-')}: ${tok.value};`)
      }
    } else if (g.name === 'radius' && data.scale) {
      const scale = data.scale as Record<string, { value: string }>
      for (const [name, tok] of Object.entries(scale)) {
        lines.push(`  --radius-${name.replace(/_/g, '-')}: ${tok.value};`)
      }
    } else if (g.name === 'motion' && data.durations) {
      const durations = data.durations as Record<string, { value: string }>
      for (const [name, tok] of Object.entries(durations)) {
        lines.push(`  --motion-${name.replace(/_/g, '-')}: ${tok.value};`)
      }
    } else if (g.name === 'motion' && data.easings) {
      const easings = data.easings as Record<string, { value: string }>
      for (const [name, tok] of Object.entries(easings)) {
        lines.push(`  --ease-${name.replace(/_/g, '-')}: ${tok.value};`)
      }
    }
  }
  lines.push('}')
  return lines.join('\n') + '\n'
}

function buildJsonModule(groups: DiscoveredGroup[], errors: string[]): string {
  const tokensByName: Record<string, unknown> = {}
  for (const g of groups) tokensByName[g.name] = g.raw
  return [
    `export const tokens = ${JSON.stringify(tokensByName)};`,
    `export const errors = ${JSON.stringify(errors)};`,
    `export const css = ${JSON.stringify(buildCss(groups))};`,
  ].join('\n')
}

const VIRTUAL_ID = 'virtual:modo-tokens'
const RESOLVED_VIRTUAL_ID = '\0' + VIRTUAL_ID

export function tokensPlugin(options: TokensPluginOptions): Plugin {
  let server: ViteDevServer | null = null

  return {
    name: 'modo-atomic-ui:tokens',
    enforce: 'pre',

    resolveId(id) {
      if (id === VIRTUAL_ID) return RESOLVED_VIRTUAL_ID
      return null
    },

    async load(id) {
      if (id !== RESOLVED_VIRTUAL_ID) return null
      const { groups, errors } = await discoverTokens(options.root)
      return buildJsonModule(groups, errors)
    },

    configureServer(s) {
      server = s
    },

    async handleHotUpdate(ctx) {
      if (ctx.file.startsWith(join(options.root, 'tokens'))) {
        const mod = server?.moduleGraph.getModuleById(RESOLVED_VIRTUAL_ID)
        if (mod) server!.moduleGraph.invalidateModule(mod)
        return []
      }
      return
    },
  }
}
