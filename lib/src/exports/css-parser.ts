// shared CSS token parser. used by:
//   - lib/src/runtime/plugins/tokens.ts (vite plugin, build/dev time)
//   - lib/src/exports/check.ts         (modo check CLI, node time)
//   - lib/src/runtime/pages/docs/tokens/@group/+Page.tsx + home page (render time, via tokens plugin)
//
// lives in src/exports/ so both runtime plugins and exports/* can import it
// without crossing the runtime↔exports boundary. not exposed via package.json
// `exports` — it's a private helper.

export interface ParsedVar {
  name: string
  value: string
  line: number
}

interface ParsedSection {
  group: Group | null
  vars: ParsedVar[]
}

export const GROUPS = [
  'colors',
  'typography',
  'spacing',
  'radius',
  'shadows',
  'motion',
] as const
export type Group = (typeof GROUPS)[number]

// prefix → group mapping. used when a single tokens.css has variables from
// multiple groups. the first match wins.
const PREFIX_TO_GROUP: Record<string, Group> = {
  'color': 'colors',
  'colors': 'colors',
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
export function groupForVar(name: string): Group | undefined {
  const stem = name.replace(/^-+/, '').toLowerCase()
  // longest-prefix match
  for (const prefix of Object.keys(PREFIX_TO_GROUP).sort((a, b) => b.length - a.length)) {
    if (stem === prefix || stem.startsWith(prefix + '-')) return PREFIX_TO_GROUP[prefix]
  }
  return undefined
}

function stripComments(src: string): string {
  // replace `/* ... */` with spaces (preserve newlines so line numbers stay sane).
  return src.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
}

function parseSections(src: string): ParsedSection[] {
  const out: ParsedSection[] = [{ group: null, vars: [] }]
  let current = out[0]!

  // walk line by line to track line numbers and to honor section comments.
  // for the data model we only collect vars from top-level `:root` blocks.
  // vars inside `@media (prefers-color-scheme: dark)` or `[data-theme="dark"]`
  // are still emitted to the actual CSS (via Vite's side-effect import) but
  // skipped here so the docs swatch labels stay aligned with the default
  // light values. nested `:root` selectors (e.g. inside @media) are also
  // skipped — `blockDepth > 1` means we're inside a wrapper block.
  const lines = src.split('\n')
  let blockDepth = 0
  let rootSelector = ''
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

    // block opens/closes on this line
    const opens = (line.match(/\{/g) ?? []).length
    const closes = (line.match(/\}/g) ?? []).length
    if (opens > 0) {
      blockDepth += opens
      if (blockDepth === 1) {
        rootSelector = line.split('{')[0]?.trim() ?? ''
      }
    }
    if (closes > 0) {
      blockDepth = Math.max(0, blockDepth - closes)
      if (blockDepth === 0) rootSelector = ''
    }

    // declaration? `--name: value;`  (value may contain colons inside parens)
    const declMatch = line.match(/^\s*--([\w-]+)\s*:\s*(.+?);?\s*$/)
    if (declMatch && rootSelector.startsWith(':root') && blockDepth === 1) {
      const name = declMatch[1]!
      let value = declMatch[2]!.trim()
      if (value.endsWith(';')) value = value.slice(0, -1).trim()
      current.vars.push({ name, value, line: i + 1 })
    }
  }
  return out
}

export function parseCss(src: string): ParsedVar[] {
  const stripped = stripComments(src)
  const sections = parseSections(stripped)
  // flatten all sections. for vars not in a section (group=null), infer
  // the group from the prefix. the renderer (buildTokens) does the final
  // grouping; here we just return all vars with their declared group
  // (or inferred as null to be filled in later).
  return sections.flatMap((s) => s.vars)
}

export function inferRole(name: string): 'surface' | 'text' | 'stroke' | 'brand' | 'state' | 'raw' {
  if (name === 'foreground' || name === 'muted-foreground' || name.endsWith('-foreground')) return 'text'
  if (name === 'accent' || name.startsWith('accent-')) return 'brand'
  if (name === 'border') return 'stroke'
  return 'surface'
}

export function inferSemantic(name: string): 'bg' | 'fg' | 'border' | 'text' | 'stroke' | 'icon' {
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
export function buildGroup(name: string, vars: ParsedVar[]): unknown {
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
  return { group: name }
}
