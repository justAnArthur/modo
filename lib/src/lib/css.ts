export interface ParsedVar {
  name: string
  value: string
  group: GroupName
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
  const out: ParsedVar[] = []
  // A declaration ends at `;` or, for the last one in a block, at `}`.
  for (const m of cleaned.matchAll(/(--[a-zA-Z0-9_-]+)\s*:\s*([^;}]+)/g)) {
    const name = m[1]!
    const value = m[2]!.trim()
    out.push({ name, value, group: prefixGroup(name) ?? 'colors' })
  }
  return out
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
