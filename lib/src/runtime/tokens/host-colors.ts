import { MUTED_ROLES, TYPE_ROLES, type TypeRole } from '../../lib/roles'
import { resolved } from './measure'

// A host color is a complete color (`#fff`) or bare channels it wraps itself
// (`--border: 286 0.4% 92%` as `hsl(var(--border))`); `var(--border)` alone drops the declaration.

/**
 * The function that turns this raw value into a color, '' when it already is
 * one, or null when it is not a color at all (a shadow, a length, a ratio).
 */
function colorWrapper(value: string): string | null {
  const v = value.trim()
  if (!v) return null
  if (CSS.supports('color', v)) return ''
  return wrappersFor(v).find(fn => CSS.supports('color', `${fn}(${v})`)) ?? null
}

/**
 * Bare channels fit several wrappers (`hsl(255 255 255)` parses too), so go by
 * convention: `H S% L%` is shadcn's hsl, plain triplets are rgb. One rule for
 * both themes, since the wrapper is fixed at startup.
 */
function wrappersFor(channels: string): string[] {
  return channels.includes('%') ? ['hsl', 'rgb', 'oklch'] : ['rgb', 'hsl', 'oklch']
}

/** A live CSS expression for a host color token: `var(--x)`, or `hsl(var(--x))` for bare channels; null if not a color. */
export function colorExpr(name: string, value?: string): string | null {
  const fn = colorWrapper(value ?? resolved(name))
  if (fn === null) return null
  return fn ? `${fn}(var(${name}))` : `var(${name})`
}

/** The same token as a concrete color string, for measuring contrast. */
export function colorValue(name: string, value?: string): string | null {
  const raw = value ?? resolved(name)
  const fn = colorWrapper(raw)
  if (fn === null) return null
  return fn ? `${fn}(${raw})` : raw
}

// The chrome's own colors: the host's token, else mixed from the inherited text color.
const CHROME: Array<[string, string, string]> = [
  ['--modo-border', '--border', 'color-mix(in oklab, currentColor 15%, transparent)'],
  ['--modo-muted', '--muted-foreground', 'color-mix(in oklab, currentColor 60%, transparent)'],
  ['--modo-ring', '--ring', 'currentColor'],
  ['--modo-background', '--background', 'Canvas'],
]

export function installHostColors(): void {
  const el = document.documentElement
  for (const [own, token, fallback] of CHROME) {
    el.style.setProperty(own, colorExpr(token) ?? fallback)
  }
  // A role without a color or a muted fallback stays unset and inherits.
  for (const role of Object.keys(TYPE_ROLES) as TypeRole[]) {
    const expr = colorExpr(`--color-${role}`) ?? (MUTED_ROLES.includes(role) ? 'var(--modo-muted)' : null)
    if (expr) el.style.setProperty(`--modo-color-${role}`, expr)
  }
}
