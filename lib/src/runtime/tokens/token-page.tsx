import type { CSSProperties, ReactElement } from 'react'
import { tokens as groups } from 'virtual:modo-tokens'
import type { Group, Swatch } from '../../lib/css'

type Var = Group['vars'][number]

const stack: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 8 }

/* The shadcn/ui theme schema, one column per family. Tokens a design system
   defines under these names render first; everything else follows as custom. */
const THEME = [
  ['background', 'card', 'popover'],
  ['primary', 'secondary', 'accent', 'muted'],
  ['destructive'],
  ['border', 'input', 'ring'],
  ['chart-1', 'chart-2', 'chart-3', 'chart-4', 'chart-5'],
  ['sidebar', 'sidebar-primary', 'sidebar-accent', 'sidebar-border', 'sidebar-ring'],
].map((col) => col.map((n) => `--${n}`))
const THEME_NAMES = new Set(THEME.flat())
const MAX_STACK = 5

export function TokenGroupView({ group }: { group: string }) {
  const g = groups.find((gg) => gg.name === group)
  if (!g) {
    return (
      <article>
        <h1 data-modo="page-title">Tokens / {group}</h1>
        <p data-modo="page-lead">No tokens found for group "{group}".</p>
      </article>
    )
  }
  const unique = declared(g.vars)
  return (
    <article>
      <header data-modo="tokens-header">
        <h1 data-modo="page-title">Tokens / {g.name}</h1>
        <span data-modo="tokens-count">{unique.length} variables</span>
      </header>
      {g.name === 'colors' ? <ColorGroups vars={unique} /> : (
        <section data-modo="section" style={stack}>
          {unique.map((v) => <TokenRow key={v.name} v={v} />)}
        </section>
      )}
    </article>
  )
}

/** Token files declare light and dark blocks; the first declaration (`:root`)
    names the token, the live cascade decides what it renders as. */
function declared(vars: Var[]): Var[] {
  return vars.filter((v, i) => vars.findIndex((w) => w.name === v.name) === i)
}

/** A group at a glance, for the Foundations overview: colors as a strip of
    fills, everything else as the same swatches the group page uses. */
export function GroupPreview({ group }: { group: string }) {
  const g = groups.find((gg) => gg.name === group)
  if (!g) return null
  const vars = declared(g.vars)
  if (g.name === 'colors') {
    return (
      <div data-modo="token-preview">
        {vars.slice(0, 12).map((v) => (
          <span key={v.name} data-modo="token-chip" style={{ background: `var(${v.name})` }} title={`${v.name}: ${v.value}`} />
        ))}
      </div>
    )
  }
  return (
    <div data-modo="token-preview">
      {vars.slice(0, 6).map((v) => (
        <span key={v.name} title={`${v.name}: ${v.value}`}><Swatch sw={v.swatch} /></span>
      ))}
    </div>
  )
}

interface Tile {
  v: Var
  /** The `<name>-foreground` partner: the host's own text color for this fill. */
  fg?: Var
}

function ColorGroups({ vars }: { vars: Var[] }) {
  const root = getComputedStyle(document.documentElement)
  const resolved = (v: Var) => root.getPropertyValue(v.name).trim() || v.value
  // Judge the resolved value: `CSS.supports` accepts anything holding a var().
  const colors = vars.filter((v) => CSS.supports('color', resolved(v)))
  const byName = new Map(colors.map((v) => [v.name, v]))
  const partner = (name: string) => byName.get(name === '--background' ? '--foreground' : `${name}-foreground`)
  const partners = new Set(colors.map((v) => partner(v.name)?.name))
  const tiles = new Map(colors.filter((v) => !partners.has(v.name)).map((v) => [v.name, { v, fg: partner(v.name) }]))

  const theme = THEME.map((col) => col.flatMap((n) => tiles.get(n) ?? []))
  const custom = families([...tiles.values()].filter((t) => !THEME_NAMES.has(t.v.name)))
  const other = vars.filter((v) => !byName.has(v.name))
  const page = pageColors()
  return (
    <>
      <ColorSection title="Theme" stacks={theme} page={page} resolved={resolved} />
      <ColorSection title="Custom" stacks={custom} page={page} resolved={resolved} />
      {other.length > 0 && (
        <section data-modo="section" style={stack}>
          <h2 data-modo="section-title">Other</h2>
          {other.map((v) => <TokenRow key={v.name} v={v} />)}
        </section>
      )}
    </>
  )
}

/** Columns of related tokens: `--chart-1…5`, `--sidebar-*`, … Tokens without
    siblings share loose columns. Long families wrap every MAX_STACK tiles. */
function families(tiles: Tile[]): Tile[][] {
  const names = tiles.map((t) => t.v.name)
  const key = (n: string) => (names.some((o) => o.startsWith(`${n}-`)) ? n : n.slice(0, n.lastIndexOf('-')))
  const byKey = new Map<string, Tile[]>()
  for (const t of tiles) byKey.set(key(t.v.name), [...(byKey.get(key(t.v.name)) ?? []), t])
  const loose = [...byKey.values()].filter((f) => f.length === 1).flat()
  return [...[...byKey.values()].filter((f) => f.length > 1), loose].flatMap(chunk)
}

function chunk(tiles: Tile[]): Tile[][] {
  const out: Tile[][] = []
  for (let i = 0; i < tiles.length; i += MAX_STACK) out.push(tiles.slice(i, i + MAX_STACK))
  return out
}

interface SectionProps {
  title: string
  stacks: Tile[][]
  page: PageColors
  resolved: (v: Var) => string
}

function ColorSection({ title, stacks, page, resolved }: SectionProps) {
  const filled = stacks.filter((s) => s.length > 0)
  if (filled.length === 0) return null
  return (
    <section data-modo="section">
      <h2 data-modo="section-title">{title}</h2>
      <div data-modo="color-grid">
        {filled.map((s) => (
          <div data-modo="color-stack" key={s[0]!.v.name}>
            {s.map((t) => <ColorTile key={t.v.name} tile={t} page={page} value={resolved(t.v)} />)}
          </div>
        ))}
      </div>
    </section>
  )
}

function ColorTile({ tile: { v, fg }, page, value }: { tile: Tile; page: PageColors; value: string }) {
  const own = paint(value)
  const seen = paint(value, page.bg)
  const hex = own[3] === 255 ? toHex(own) : null
  // No host pairing: write in whichever page color (its text or its canvas)
  // reads best on this fill.
  const ink = contrast(seen, paint(page.fg)) >= contrast(seen, paint(page.bg)) ? page.fg : page.bg
  return (
    <div
      data-modo="color-tile"
      data-flush={contrast(seen, paint(page.bg)) < 1.15 || undefined}
      style={{ background: `var(${v.name})`, color: fg ? `var(${fg.name})` : ink }}
      title={[`${v.name}: ${v.value}`, hex, fg && `${fg.name}: ${fg.value}`].filter(Boolean).join('\n')}
    >
      <span data-modo="color-tile-name">{v.name}</span>
      <span data-modo="color-tile-value">
        <span>{v.value}</span>
        {hex && !v.value.startsWith('#') ? <span>{hex}</span> : null}
      </span>
      {fg ? <span data-modo="color-tile-pair">{fg.name}</span> : null}
    </div>
  )
}

interface PageColors {
  fg: string
  bg: string
}

/** The host's page text and canvas colors, as the docs content inherits them. */
function pageColors(): PageColors {
  const at = document.querySelector('[data-modo="content"]') ?? document.body
  let bg = 'white'
  for (let el: Element | null = at; el; el = el.parentElement) {
    const c = getComputedStyle(el).backgroundColor
    if (paint(c)[3] > 0) {
      bg = c
      break
    }
  }
  return { fg: getComputedStyle(at).color, bg }
}

type Rgba = [number, number, number, number]

const pen = document.createElement('canvas').getContext('2d', { willReadFrequently: true })!

/** Paint `color` (over `under`) and read the pixel back — resolves any CSS
    color syntax the browser knows (oklch, color-mix, …) to sRGB. */
function paint(color: string, under?: string): Rgba {
  pen.clearRect(0, 0, 1, 1)
  if (under) {
    pen.fillStyle = under
    pen.fillRect(0, 0, 1, 1)
  }
  pen.fillStyle = color
  pen.fillRect(0, 0, 1, 1)
  const [r, g, b, a] = pen.getImageData(0, 0, 1, 1).data
  return [r!, g!, b!, a!]
}

function toHex([r, g, b]: Rgba): string {
  return `#${[r, g, b].map((n) => n.toString(16).padStart(2, '0')).join('')}`
}

function contrast(a: Rgba, b: Rgba): number {
  const [la, lb] = [luminance(a), luminance(b)]
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
}

function luminance([r, g, b]: Rgba): number {
  const lin = (c: number) => (c / 255 <= 0.04045 ? c / 255 / 12.92 : ((c / 255 + 0.055) / 1.055) ** 2.4)
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
}

function TokenRow({ v }: { v: Var }) {
  const sw = v.swatch
  return (
    <div data-modo="token-row">
      <Swatch sw={sw} />
      <code>{v.name}</code>
      <span data-modo="token-row-value">
        {v.value}
        {sw ? <span> · {meta(sw)}</span> : null}
      </span>
    </div>
  )
}

function Swatch({ sw }: { sw?: Swatch }): ReactElement | null {
  if (!sw) return null
  const box = (style: CSSProperties) => <span data-modo="swatch" style={style} />
  const text = (style: CSSProperties) => <span data-modo="swatch" style={{ padding: '0 6px', ...style }}>Aa</span>
  const fill = 'var(--primary, var(--accent, currentColor))'
  switch (sw.kind) {
    case 'color': return box({ background: sw.hex })
    case 'length': return box({ width: Math.min(sw.px, 80), background: fill })
    case 'duration': return box({ background: fill })
    case 'font-family': return text({ fontFamily: sw.family })
    case 'font-size': return text({ fontSize: sw.px })
  }
}

function meta(sw: Swatch): string {
  switch (sw.kind) {
    case 'color': return sw.hex
    case 'length': return `${sw.px}px`
    case 'duration': return `${sw.ms}ms`
    case 'font-family': return sw.family
    case 'font-size': return `${sw.px}px`
  }
}
