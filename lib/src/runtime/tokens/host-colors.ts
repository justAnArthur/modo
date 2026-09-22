/* Host color tokens come in two shapes: a complete color (`oklch(0.2 0 0)`,
   `#fff`) or the bare channels a design system wraps itself (`--border:
   286 0.4% 92%`, used as `hsl(var(--border))`). Chrome CSS that writes
   `var(--border)` straight into a property silently loses the whole
   declaration for the second shape, so resolve the wrapper once and hand the
   rest of the runtime an expression that is valid either way. */

const WRAPPERS = ['', 'hsl', 'oklch', 'rgb', 'lab', 'lch', 'hwb'] as const

/** The function that turns this raw value into a color, '' when it already is
    one, or null when it is not a color at all (a shadow, a length, a ratio). */
export function colorWrapper(value: string): string | null {
  const v = value.trim()
  if (!v) return null
  for (const fn of WRAPPERS) {
    if (CSS.supports('color', fn ? `${fn}(${v})` : v)) return fn
  }
  return null
}

function root(): CSSStyleDeclaration {
  return getComputedStyle(document.documentElement)
}

/** The token's declared value with its var() references already substituted. */
export function resolved(name: string, fallback = ''): string {
  return root().getPropertyValue(name).trim() || fallback
}

/** A live CSS expression for a host color token — `var(--x)`, or
    `hsl(var(--x))` when the token holds bare channels. Null if not a color. */
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

/* Chrome colors the lib itself draws with: the host's token when it has one,
   otherwise derived from the inherited text color. Published as custom
   properties so shell.css stays declarative. */
const CHROME: Array<[string, string, string]> = [
  ['--modo-border', '--border', 'color-mix(in oklab, currentColor 15%, transparent)'],
  ['--modo-muted', '--muted-foreground', 'color-mix(in oklab, currentColor 60%, transparent)'],
]

export function installHostColors(): void {
  const el = document.documentElement
  for (const [own, token, fallback] of CHROME) {
    el.style.setProperty(own, colorExpr(token) ?? fallback)
  }
}
