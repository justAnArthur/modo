/* Host color tokens come in two shapes: a complete color (`oklch(0.2 0 0)`,
   `#fff`) or the bare channels a design system wraps itself (`--border:
   286 0.4% 92%`, used as `hsl(var(--border))`). Chrome CSS that writes
   `var(--border)` straight into a property silently loses the whole
   declaration for the second shape, so resolve the wrapper once and hand the
   rest of the runtime an expression that is valid either way. */

/** The function that turns this raw value into a color, '' when it already is
    one, or null when it is not a color at all (a shadow, a length, a ratio). */
function colorWrapper(value: string): string | null {
  const v = value.trim()
  if (!v) return null
  if (CSS.supports('color', v)) return ''
  return wrappersFor(v).find(fn => CSS.supports('color', `${fn}(${v})`)) ?? null
}

/** Bare channels fit several wrappers (`hsl(255 255 255)` parses too), so go
    by convention: `H S% L%` is shadcn's hsl, plain triplets are rgb. One rule
    for both themes, since the wrapper is fixed at startup. */
function wrappersFor(channels: string): string[] {
  return channels.includes('%') ? ['hsl', 'rgb', 'oklch'] : ['rgb', 'hsl', 'oklch']
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
  ['--modo-ring', '--ring', 'currentColor'],
]

/* Type roles' colors (`--color-<role>`), with the muted fallback where the
   chrome has always dimmed a role. A role without either stays unset and
   inherits. */
const ROLES: Array<[string, string | null]> = [
  ['h1', null],
  ['h2', null],
  ['h3', null],
  ['h4', null],
  ['p', null],
  ['lead', 'var(--modo-muted)'],
  ['eyebrow', 'var(--modo-muted)'],
]

export function installHostColors(): void {
  const el = document.documentElement
  for (const [own, token, fallback] of CHROME) {
    el.style.setProperty(own, colorExpr(token) ?? fallback)
  }
  for (const [role, fallback] of ROLES) {
    const expr = colorExpr(`--color-${role}`) ?? fallback
    if (expr) el.style.setProperty(`--modo-color-${role}`, expr)
  }
}
