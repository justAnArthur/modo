export interface ParsedVar {
  name: string
  value: string
  group: GroupName
  /** Set when the declaring block only applies in dark mode (`.dark`, `prefers-color-scheme: dark`). */
  scheme?: 'dark'
}

export interface LengthSwatch {
  kind: 'length'
  px: number
}

export interface DurationSwatch {
  kind: 'duration'
  ms: number
}

export interface FontFamilySwatch {
  kind: 'font-family'
  family: string
}

export interface FontSizeSwatch {
  kind: 'font-size'
  px: number
}

export interface FontWeightSwatch {
  kind: 'font-weight'
  /** A weight (`600`) or a variable font's axis settings (`"wght" 550, "opsz" 18`). */
  value: string
}

// Colors have none: the colors view resolves them live in the browser.
export type Swatch = LengthSwatch | DurationSwatch | FontFamilySwatch | FontSizeSwatch | FontWeightSwatch

export interface Group {
  name: GroupName
  vars: Array<ParsedVar & { swatch?: Swatch }>
}

export const GROUPS = ['colors', 'typography', 'spacing', 'radius', 'motion'] as const
export type GroupName = (typeof GROUPS)[number]

const PREFIX_TO_GROUP: Record<string, GroupName> = {
  '--space-': 'spacing',
  '--spacing-': 'spacing',
  '--radius-': 'radius',
  '--motion-': 'motion',
  '--duration-': 'motion',
  '--ease-': 'motion',
  '--font-': 'typography',
  '--text-': 'typography',
  '--leading-': 'typography',
  '--tracking-': 'typography',
}

// Single-token shorthands (e.g. shadcn's bare `--radius`) group with their
// prefixed siblings instead of defaulting to colors.
const EXACT_TO_GROUP: Record<string, GroupName> = {
  '--space': 'spacing',
  '--spacing': 'spacing',
  '--radius': 'radius',
  '--motion': 'motion',
  '--duration': 'motion',
  '--ease': 'motion',
  '--font': 'typography',
}

export function parseCss(src: string): ParsedVar[] {
  const cleaned = stripComments(src)
  const dark = darkBlocks(cleaned)
  const out: ParsedVar[] = []
  // A declaration ends at `;` or, for the last one in a block, at `}`.
  for (const m of cleaned.matchAll(/(--[a-zA-Z0-9_-]+)\s*:\s*([^;}]+)/g)) {
    const name = m[1]!
    const value = m[2]!.trim()
    const inDark = dark.some(([start, end]) => m.index > start && m.index < end)
    out.push({ name, value, group: prefixGroup(name) ?? 'colors', ...(inDark && { scheme: 'dark' as const }) })
  }
  return out
}

/** The [open, close] offsets of every block that only applies in dark mode. */
function darkBlocks(src: string): Array<[number, number]> {
  const out: Array<[number, number]> = []
  const open: Array<{ at: number; dark: boolean }> = []
  let prelude = 0
  for (let i = 0; i < src.length; i++) {
    const c = src[i]
    if (c === '{') {
      open.push({ at: i, dark: isDarkPrelude(src.slice(prelude, i)) })
      prelude = i + 1
    } else if (c === '}') {
      const block = open.pop()
      if (block?.dark) out.push([block.at, i])
      prelude = i + 1
    } else if (c === ';') {
      prelude = i + 1
    }
  }
  return out
}

// `:root, .light, .dark` serves both schemes; only a list that is all dark is.
function isDarkPrelude(prelude: string): boolean {
  const p = prelude.trim()
  if (p.startsWith('@')) return /prefers-color-scheme\s*:\s*dark/.test(p)
  return p.split(',').every(sel => /dark/i.test(sel))
}

/** A token's light and dark values, when the host declares both: a dark
    block's redeclaration, or one `light-dark(a, b)` value. */
export function schemePair(vars: ParsedVar[], name: string): { light: string; dark: string } | null {
  const own = vars.filter(v => v.name === name)
  const light = own.find(v => v.scheme !== 'dark')
  const dark = own.find(v => v.scheme === 'dark')
  if (light && dark) return { light: light.value, dark: dark.value }
  const both = light && lightDark(light.value)
  return both ? { light: both[0], dark: both[1] } : null
}

/** `light-dark(a, b)` → [a, b]; null for any other value. */
export function lightDark(value: string): [string, string] | null {
  const body = value.trim().match(/^light-dark\(([\s\S]*)\)$/)?.[1]
  if (!body) return null
  let depth = 0
  for (let i = 0; i < body.length; i++) {
    const c = body[i]
    if (c === '(') depth++
    else if (c === ')') depth--
    else if (c === ',' && depth === 0) return [body.slice(0, i).trim(), body.slice(i + 1).trim()]
  }
  return null
}

/** The group a var's name claims (`--radius-sm` → radius), null when unprefixed. */
export function prefixGroup(name: string): GroupName | null {
  const exact = EXACT_TO_GROUP[name]
  if (exact) return exact
  for (const [prefix, group] of Object.entries(PREFIX_TO_GROUP)) {
    if (name.startsWith(prefix)) return group
  }
  return null
}

/** `all` resolves references: `--font-size-h1: var(--text-display)` is a size, not a family. */
export function buildGroup(name: GroupName, vars: ParsedVar[], all: ParsedVar[] = vars): Group {
  const byName = new Map(all.map(v => [v.name, v.value]))
  return {
    name,
    vars: vars.map(v => ({ ...v, swatch: buildSwatch(name, { ...v, value: resolveRef(v.value, byName) }) })),
  }
}

function resolveRef(value: string, byName: Map<string, string>, seen = new Set<string>()): string {
  const ref = value.match(/^var\((--[\w-]+)\)$/)?.[1]
  const next = ref && !seen.has(ref) ? byName.get(ref) : undefined
  if (next === undefined) return value
  seen.add(ref!)
  return resolveRef(next, byName, seen)
}

function buildSwatch(group: GroupName, { name, value }: ParsedVar): Swatch | undefined {
  if (group === 'colors') return undefined
  if (group === 'spacing' || group === 'radius') return lengthSwatch(value)
  if (group === 'motion') return durationSwatch(value) ?? lengthSwatch(value)
  return typographySwatch(name, value)
}

// By name first: `--font-weight-bold: 700` and `--leading-tight: 1.25` are
// numbers, not font sizes.
function typographySwatch(name: string, value: string): Swatch | undefined {
  if (name.includes('weight') || value.includes('"wght"') || /^[1-9]00$/.test(value))
    return { kind: 'font-weight', value }
  if (/^--(leading|tracking)-|line-height|letter-spacing|color/.test(name)) return undefined
  if (/^\d/.test(value)) return fontSizeSwatch(value) ?? lengthSwatch(value)
  return { kind: 'font-family', family: value }
}

function lengthSwatch(value: string): LengthSwatch | undefined {
  const m = value.trim().match(/^(-?\d*\.?\d+)(px|rem|em|%|vh|vw)?$/i)
  if (!m) return undefined
  const n = parseFloat(m[1]!)
  const unit = (m[2] ?? 'px').toLowerCase()
  return { kind: 'length', px: unit === 'rem' || unit === 'em' ? n * 16 : n }
}

function durationSwatch(value: string): DurationSwatch | undefined {
  const m = value.trim().match(/^(-?\d*\.?\d+)(ms|s)$/i)
  if (!m) return undefined
  const n = parseFloat(m[1]!)
  const unit = m[2]!.toLowerCase()
  return { kind: 'duration', ms: unit === 's' ? n * 1000 : n }
}

function fontSizeSwatch(value: string): FontSizeSwatch | undefined {
  const ls = lengthSwatch(value)
  if (!ls) return undefined
  return { kind: 'font-size', px: ls.px }
}

function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '')
}
