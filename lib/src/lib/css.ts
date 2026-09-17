export interface ParsedVar {
  name: string
  value: string
  raw: string
  group: GroupName
}

export interface ColorSwatch {
  kind: 'color'
  hex: string
  rgb: [number, number, number]
}

export interface LengthSwatch {
  kind: 'length'
  px: number
  unit: string
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

export type Swatch = ColorSwatch | LengthSwatch | DurationSwatch | FontFamilySwatch | FontSizeSwatch

export interface Group {
  name: string
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
  const re = /(--[a-zA-Z0-9_-]+)\s*:\s*([^;]+);/g
  let m: RegExpExecArray | null
  while ((m = re.exec(cleaned)) !== null) {
    const name = m[1]!
    const value = m[2]!.trim()
    const raw = m[0]
    out.push({ name, value, raw, group: groupForVar(name) ?? 'colors' })
  }
  return out
}

export function groupForVar(name: string): GroupName | null {
  const exact = EXACT_TO_GROUP[name]
  if (exact) return exact
  for (const [prefix, group] of Object.entries(PREFIX_TO_GROUP)) {
    if (name.startsWith(prefix)) return group
  }
  return 'colors'
}

export function buildGroup(name: GroupName, vars: ParsedVar[]): Group {
  return {
    name,
    vars: vars.map((v) => ({ ...v, swatch: buildSwatch(name, v.value) })),
  }
}

function buildSwatch(group: GroupName, value: string): Swatch | undefined {
  if (group === 'colors') return colorSwatch(value)
  if (group === 'spacing' || group === 'radius') return lengthSwatch(value)
  if (group === 'motion') return durationSwatch(value) ?? lengthSwatch(value)
  if (group === 'typography') {
    if (/^\d/.test(value.trim())) return fontSizeSwatch(value) ?? lengthSwatch(value)
    return { kind: 'font-family', family: value }
  }
  return undefined
}

function colorSwatch(value: string): ColorSwatch | undefined {
  const v = value.trim()
  const hex = v.match(/^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i)
  if (hex) {
    const h = hex[1]!
    const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h.slice(0, 6)
    const r = parseInt(full.slice(0, 2), 16)
    const g = parseInt(full.slice(2, 4), 16)
    const b = parseInt(full.slice(4, 6), 16)
    return { kind: 'color', hex: `#${full.toLowerCase()}`, rgb: [r, g, b] }
  }
  const rgb = v.match(/^rgba?\(([^)]+)\)$/i)
  if (rgb) {
    const parts = rgb[1]!.split(',').map((s) => s.trim())
    const r = parseChannel(parts[0])
    const g = parseChannel(parts[1])
    const b = parseChannel(parts[2])
    if (r != null && g != null && b != null) {
      return { kind: 'color', hex: rgbToHex(r, g, b), rgb: [r, g, b] }
    }
  }
  const hsl = v.match(/^hsla?\(([^)]+)\)$/i)
  if (hsl) {
    const parts = hsl[1]!.split(',').map((s) => s.trim())
    const h = parseFloat(parts[0] ?? '')
    const sPct = parseFloat((parts[1] ?? '').replace('%', ''))
    const lPct = parseFloat((parts[2] ?? '').replace('%', ''))
    if (!Number.isNaN(h) && !Number.isNaN(sPct) && !Number.isNaN(lPct)) {
      const [r, g, b] = hslToRgb(h, sPct / 100, lPct / 100)
      return { kind: 'color', hex: rgbToHex(r, g, b), rgb: [r, g, b] }
    }
  }
  return undefined
}

function parseChannel(s: string | undefined): number | null {
  if (!s) return null
  if (s.endsWith('%')) return Math.round((parseFloat(s) / 100) * 255)
  const n = parseFloat(s)
  return Number.isNaN(n) ? null : Math.round(n)
}

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => Math.max(0, Math.min(255, n)).toString(16).padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const hh = ((h % 360) + 360) % 360 / 60
  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs((hh % 2) - 1))
  let r1 = 0, g1 = 0, b1 = 0
  if (hh < 1) [r1, g1, b1] = [c, x, 0]
  else if (hh < 2) [r1, g1, b1] = [x, c, 0]
  else if (hh < 3) [r1, g1, b1] = [0, c, x]
  else if (hh < 4) [r1, g1, b1] = [0, x, c]
  else if (hh < 5) [r1, g1, b1] = [x, 0, c]
  else [r1, g1, b1] = [c, 0, x]
  const m = l - c / 2
  return [Math.round((r1 + m) * 255), Math.round((g1 + m) * 255), Math.round((b1 + m) * 255)]
}

function lengthSwatch(value: string): LengthSwatch | undefined {
  const m = value.trim().match(/^(-?\d*\.?\d+)(px|rem|em|%|vh|vw)?$/i)
  if (!m) return undefined
  const n = parseFloat(m[1]!)
  const unit = (m[2] ?? 'px').toLowerCase()
  const px = unit === 'rem' || unit === 'em' ? n * 16 : n
  return { kind: 'length', px, unit }
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
