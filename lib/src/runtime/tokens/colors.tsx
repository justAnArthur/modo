import { useSyncExternalStore } from 'react'
import { lightDark, schemePair } from '../../lib/css'
import { contrast, luminance, type PageColors, pageColors, paint, toHex } from './color-math'
import { colorExpr, colorValue } from './host-colors'
import { resolved } from './measure'
import { OtherTokens, TokenSection, type Var } from './parts'

/* The shadcn/ui theme schema, one column per family. Tokens a design system
   defines under these names render first; everything else follows as custom. */
const THEME = [
  ['background', 'card', 'popover'],
  ['primary', 'secondary', 'accent', 'muted'],
  ['destructive'],
  ['border', 'input', 'ring'],
  ['chart-1', 'chart-2', 'chart-3', 'chart-4', 'chart-5'],
  ['sidebar', 'sidebar-primary', 'sidebar-accent', 'sidebar-border', 'sidebar-ring'],
].map(col => col.map(n => `--${n}`))
const THEME_NAMES = new Set(THEME.flat())
const MAX_STACK = 5
const STRIP = 16

/** The palette as a strip: theme tokens first, foregrounds left out. */
export function ColorPreview({ vars }: { vars: Var[] }) {
  const { theme, custom } = colorTiles(vars)
  return (
    <div data-modo="color-strip">
      {[...theme.flat(), ...custom.flat()].slice(0, STRIP).map(({ v }) => (
        <span key={v.name} data-modo="token-chip" style={{ background: colorExpr(v.name) ?? v.value }} title={v.name} />
      ))}
    </div>
  )
}

interface Tile {
  v: Var
  /** The `<name>-foreground` partner: the host's own text color for this fill. */
  fg?: Var
}

// A host switches theme through <html> (a class, an attribute, an inline
// style) or follows the OS; either way the tiles are measured again.
const dark = matchMedia('(prefers-color-scheme: dark)')

function subscribeTheme(onChange: () => void) {
  const observer = new MutationObserver(onChange)
  observer.observe(document.documentElement, { attributes: true })
  dark.addEventListener('change', onChange)
  return () => {
    observer.disconnect()
    dark.removeEventListener('change', onChange)
  }
}

function themeSnapshot(): string {
  const attrs = [...document.documentElement.attributes].map(a => `${a.name}=${a.value}`)
  return `${attrs.join(' ')} ${dark.matches}`
}

/** The color tokens as tiles, each fill with its foreground partner: the
    theme schema's columns, then the custom families, then the non-colors.
    A token counts as a color when its resolved value is one, either on its
    own or wrapped the way the host wraps it (`hsl(var(--border))`). */
function colorTiles(vars: Var[]) {
  const colors = vars.filter(v => colorValue(v.name, resolved(v.name, v.value)) !== null)
  const byName = new Map(colors.map(v => [v.name, v]))
  const partner = (name: string) => byName.get(name === '--background' ? '--foreground' : `${name}-foreground`)
  const partners = new Set(colors.map(v => partner(v.name)?.name))
  const tiles = new Map(colors.filter(v => !partners.has(v.name)).map(v => [v.name, { v, fg: partner(v.name) }]))
  return {
    theme: THEME.map(col => col.flatMap(n => tiles.get(n) ?? [])),
    custom: families([...tiles.values()].filter(t => !THEME_NAMES.has(t.v.name))),
    other: vars.filter(v => !byName.has(v.name)),
  }
}

export function ColorGroups({ vars, all }: { vars: Var[]; all: Var[] }) {
  useSyncExternalStore(subscribeTheme, themeSnapshot)
  const { theme, custom, other } = colorTiles(vars)
  const page = pageColors()
  return (
    <>
      <ColorSection title="Theme" stacks={theme} page={page} all={all} />
      <ColorSection title="Custom" stacks={custom} page={page} all={all} />
      <OtherTokens vars={other} />
    </>
  )
}

/** Columns of related tokens: `--chart-1…5`, `--sidebar-*`, … Tokens without
    siblings share loose columns. Long families wrap every MAX_STACK tiles. */
function families(tiles: Tile[]): Tile[][] {
  const names = tiles.map(t => t.v.name)
  const key = (n: string) => (names.some(o => o.startsWith(`${n}-`)) ? n : n.slice(0, n.lastIndexOf('-')))
  const byKey = new Map<string, Tile[]>()
  for (const t of tiles) byKey.set(key(t.v.name), [...(byKey.get(key(t.v.name)) ?? []), t])
  const loose = [...byKey.values()].filter(f => f.length === 1).flat()
  return [...[...byKey.values()].filter(f => f.length > 1), loose].flatMap(chunk)
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
  all: Var[]
}

function ColorSection({ title, stacks, page, all }: SectionProps) {
  const filled = stacks.filter(s => s.length > 0)
  if (filled.length === 0) return null
  return (
    <TokenSection title={title}>
      <div data-modo="color-grid">
        {filled.map(s => (
          <div data-modo="color-stack" key={s[0]!.v.name}>
            {s.map(t => (
              <ColorTile key={t.v.name} tile={t} page={page} all={all} />
            ))}
          </div>
        ))}
      </div>
    </TokenSection>
  )
}

function ColorTile({ tile: { v, fg }, page, all }: { tile: Tile; page: PageColors; all: Var[] }) {
  const value = colorValue(v.name, resolved(v.name, v.value)) ?? v.value
  const own = paint(value)
  const seen = paint(value, page.bg)
  const hex = own[3] === 255 ? toHex(own) : null
  // The value in the current scheme: the first declaration may be the other one's.
  const live = schemeValue(resolved(v.name, v.value), page)
  // No host pairing: write in whichever page color (its text or its canvas)
  // reads best on this fill.
  const ink = contrast(seen, paint(page.fg)) >= contrast(seen, paint(page.bg)) ? page.fg : page.bg
  return (
    <div
      data-modo="color-tile"
      data-flush={contrast(seen, paint(page.bg)) < 1.15 || undefined}
      style={{ background: colorExpr(v.name) ?? value, color: (fg && colorExpr(fg.name)) || ink }}
      title={[`${v.name}: ${v.value}`, hex, fg && `${fg.name}: ${fg.value}`].filter(Boolean).join('\n')}
    >
      <span data-modo="color-tile-name">{v.name}</span>
      {fg ? <span data-modo="color-tile-pair">{fg.name}</span> : null}
      <div data-modo="color-tile-foot">
        <span data-modo="color-tile-value">
          {hex ? <span>{hex}</span> : null}
          {live !== hex ? <span>{live}</span> : null}
        </span>
        <SchemeChips v={v} all={all} />
      </div>
    </div>
  )
}

/** The token's light and dark values side by side, when the host declares
    both as plain colors (a value that references other tokens would resolve
    in the current scheme only, so it gets no chip). */
function SchemeChips({ v, all }: { v: Var; all: Var[] }) {
  const pair = schemePair(all, v.name)
  if (!pair) return null
  const fill = (raw: string) => (raw.includes('var(') ? null : colorValue(v.name, raw))
  const [light, dark] = [fill(pair.light), fill(pair.dark)]
  if (!light || !dark) return null
  return (
    <span
      data-modo="color-tile-schemes"
      title={`Light: ${pair.light}\nDark: ${pair.dark}`}
      style={{ background: `linear-gradient(135deg, ${light} 50%, ${dark} 50%)` }}
    />
  )
}

/** `light-dark(a, b)` as the side the page renders: the darker canvas picks b. */
function schemeValue(value: string, page: PageColors): string {
  const both = lightDark(value)
  if (!both) return value
  return luminance(paint(page.bg)) < 0.5 ? both[1] : both[0]
}
