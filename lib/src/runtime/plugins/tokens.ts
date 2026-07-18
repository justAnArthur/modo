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

export interface TokensPluginOptions {
  root: string
}

const GROUPS = ['colors', 'surfaces', 'typography', 'spacing', 'radius', 'shadows', 'motion'] as const
type Group = (typeof GROUPS)[number]

// prefix → group mapping. used when a single tokens.css has variables from
// multiple groups. the first match wins.
const PREFIX_TO_GROUP: Record<string, Group> = {
  'color': 'colors',
  'colors': 'colors',
  'surface': 'colors',
  'foreground': 'colors',
  'background': 'colors',
  'muted': 'colors',
  'border': 'colors',
  'accent': 'colors',
  'shadow': 'shadows',
  'font': 'typography',
  'space': 'spacing',
  'radius': 'radius',
  'motion': 'motion',
  'ease': 'motion',
}

// strip leading --, lowercase prefix, and match against the map.
function groupForVar(name: string): Group | undefined {
  const stem = name.replace(/^-+/, '').toLowerCase()
  // longest-prefix match
  for (const prefix of Object.keys(PREFIX_TO_GROUP).sort((a, b) => b.length - a.length)) {
    if (stem === prefix || stem.startsWith(prefix + '-')) return PREFIX_TO_GROUP[prefix]
  }
  return undefined
}

// ── minimal CSS parser ──────────────────────────────────────────────
// we don't need a full CSS parser — we just need to find `--name: value;`
// declarations and `/* @group foo */` / `/* foo */` section comments.
// the CSS we accept is:
//   - :root { ... } blocks (we strip the wrapper, keep the declarations)
//   - arbitrary nesting (e.g. :root or @media) — we just keep top-level
//     declarations inside the FIRST :root block, plus everything in nested
//     blocks that come after
//   - comments: /* ... */ (multi-line, we look for `@group NAME`)

interface ParsedVar {
  name: string
  value: string
  line: number
}

interface ParsedSection {
  group: Group | null
  vars: ParsedVar[]
}

function stripComments(src: string): string {
  // replace `/* ... */` with spaces (preserve newlines so line numbers stay sane).
  return src.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
}

function parseSections(src: string): ParsedSection[] {
  const out: ParsedSection[] = [{ group: null, vars: [] }]
  let current = out[0]!

  // walk line by line to track line numbers and to honor section comments.
  const lines = src.split('\n')
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!

    // section comment? `/* @group NAME */` or `/* NAME */` (where NAME is a group)
    const commentMatch = line.match(/\/\*\s*(?:@group\s+)?(\w+)\s*\*\//)
    if (commentMatch) {
      const candidate = commentMatch[1] as string
      if ((GROUPS as readonly string[]).includes(candidate)) {
        current = { group: candidate as Group, vars: [] }
        out.push(current)
        continue
      }
    }

    // declaration? `--name: value;`  (value may contain colons inside parens)
    const declMatch = line.match(/^\s*--([\w-]+)\s*:\s*(.+?);?\s*$/)
    if (declMatch) {
      const name = declMatch[1]!
      let value = declMatch[2]!.trim()
      if (value.endsWith(';')) value = value.slice(0, -1).trim()
      current.vars.push({ name, value, line: i + 1 })
    }
  }
  return out
}

function parseCss(src: string): ParsedVar[] {
  const stripped = stripComments(src)
  const sections = parseSections(stripped)
  // flatten all sections. for vars not in a section (group=null), infer
  // the group from the prefix. the renderer (buildTokens) does the final
  // grouping; here we just return all vars with their declared group
  // (or inferred as null to be filled in later).
  return sections.flatMap((s) => s.vars)
}

// ── group assembly ───────────────────────────────────────────────────

export { parseCss, groupForVar, buildGroup, inferRole, inferSemantic }

interface DiscoveredGroup {
  name: string
  raw: unknown
  errors: string[]
}

function inferRole(name: string): 'surface' | 'text' | 'stroke' | 'brand' | 'state' | 'raw' {
  if (name === 'foreground' || name === 'muted-foreground' || name.endsWith('-foreground')) return 'text'
  if (name === 'accent' || name.startsWith('accent-')) return 'brand'
  if (name === 'border') return 'stroke'
  return 'surface'
}

function inferSemantic(name: string): 'bg' | 'fg' | 'border' | 'text' | 'stroke' | 'icon' {
  if (name === 'foreground' || name.endsWith('-foreground')) return 'fg'
  if (name === 'border') return 'border'
  if (name === 'muted-foreground') return 'fg'
  return 'bg'
}

// group vars into a token group object, mirroring the old shape:
//   colors:     { group, items: { name: { value, semantic, role } } }
//   spacing:    { group, scale: { name: { value, px? } } }
//   radius:     { group, scale: { name: { value } } }
//   motion:     { group, durations: { ... }, easings: { ... } }
//   typography: { group, families: { ... }, scale: { ... } }
//   shadows:    { group, levels: { name: { value } } }
//   surfaces:   { group, levels: { '1'..'8': { bg, shadow } } }  (synthesized from colors)
function buildGroup(name: string, vars: ParsedVar[]): unknown {
  if (name === 'colors') {
    const items: Record<string, { value: string; semantic: string; role: string }> = {}
    for (const v of vars) {
      items[v.name] = {
        value: v.value,
        semantic: inferSemantic(v.name),
        role: inferRole(v.name),
      }
    }
    return { group: 'colors', items }
  }
  if (name === 'spacing') {
    const scale: Record<string, { value: string; px: number }> = {}
    for (const v of vars) {
      const pxMatch = v.value.match(/^(-?\d+(?:\.\d+)?)\s*px$/)
      scale[v.name] = { value: v.value, px: pxMatch ? Number(pxMatch[1]) : 0 }
    }
    return { group: 'spacing', scale }
  }
  if (name === 'radius') {
    const scale: Record<string, { value: string }> = {}
    for (const v of vars) scale[v.name] = { value: v.value }
    return { group: 'radius', scale }
  }
  if (name === 'shadows') {
    const levels: Record<string, { value: string }> = {}
    for (const v of vars) levels[v.name.replace(/^shadow-/, '')] = { value: v.value }
    return { group: 'shadows', levels }
  }
  if (name === 'motion') {
    const durations: Record<string, { value: string; ms: number }> = {}
    const easings: Record<string, { value: string }> = {}
    for (const v of vars) {
      if (v.name.startsWith('ease-') || v.name === 'linear') {
        easings[v.name.replace(/^ease-/, '')] = { value: v.value }
      } else {
        const msMatch = v.value.match(/^(-?\d+(?:\.\d+)?)\s*ms$/)
        durations[v.name] = { value: v.value, ms: msMatch ? Number(msMatch[1]) : 0 }
      }
    }
    return { group: 'motion', durations, easings }
  }
  if (name === 'typography') {
    const families: Record<string, string> = {}
    const scale: Record<string, { size: string; lineHeight: string; letterSpacing: string }> = {}
    for (const v of vars) {
      if (v.name.startsWith('font-') || ['sans', 'serif', 'mono'].includes(v.name)) {
        families[v.name.replace(/^font-/, '')] = v.value
      } else {
        // size/line-height/letter-spacing parsed from composite value, e.g.
        // `15px / 1.5 / 0`. for now just pass the raw value through.
        scale[v.name] = { size: v.value, lineHeight: '1.4', letterSpacing: '0' }
      }
    }
    return { group: 'typography', families, scale }
  }
  if (name === 'surfaces') {
    // synthesized: levels 1..8 each with bg + shadow refs.
    const levels: Record<string, { bg: string; shadow: string }> = {}
    for (let i = 1; i <= 8; i++) {
      levels[String(i)] = { bg: `surface-${i}`, shadow: `shadow-${i}` }
    }
    return { group: 'surfaces', levels }
  }
  return { group: name }
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
  const groups: DiscoveredGroup[] = []
  for (const name of GROUPS) {
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
