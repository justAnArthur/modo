import type { CSSProperties } from 'react'
import { primaryFamily, px, rem, spread } from './format'
import { resolved } from './host-colors'
import { byLength, lengthOf, OtherTokens, TokenLabel, TokenSection, type Var } from './token-row'

const SAMPLE = 'The quick brown fox jumps over the lazy dog'
const SHORT_SAMPLE = 'Quick brown fox'
const GLYPHS = ['ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz', '0123456789 !?&@#%']

type Role = 'family' | 'size' | 'weight' | 'other'

/** The contract's type roles (shell.css), each with the tag it renders as. */
const ELEMENTS = {
  h1: 'h1',
  h2: 'h2',
  h3: 'h3',
  h4: 'h4',
  p: 'p',
  lead: 'p',
  eyebrow: 'p',
  sm: 'p',
  xs: 'p',
} as const
type ElementRole = keyof typeof ELEMENTS

const ROLE_TOKEN = new RegExp(`^--(font-size|line-height|font-weight|color)-(${Object.keys(ELEMENTS).join('|')})$`)
const SIZE_PREFIX = /^--(text|font-size)-/

// The parser classifies by name (lib/css.ts); leading and tracking have no swatch.
function role(v: Var): Role {
  switch (v.swatch?.kind) {
    case 'font-weight':
      return 'weight'
    case 'font-size':
      return 'size'
    case 'font-family':
      return 'family'
    default:
      return 'other'
  }
}

function roles(all: Var[]) {
  const elements = (Object.keys(ELEMENTS) as ElementRole[]).filter(e => all.some(v => v.name === `--font-size-${e}`))
  const vars = all.filter(v => !ROLE_TOKEN.test(v.name))
  const of = (r: Role) => vars.filter(v => role(v) === r)
  const weights = of('weight')
  const sizes = byLength(of('size'))
  /** A size's own weight, when the system pairs them (`--text-h1-weight`). */
  const weightOf = (size: Var) => weights.find(w => w.name === `${size.name}-weight`)
  /** A size's own line-height: `--leading-x` / `--line-height-x` for `--text-x`, or Tailwind's `--text-x--line-height`. */
  const leadingOf = (size: Var) => {
    const step = size.name.replace(SIZE_PREFIX, '')
    const names = [`--leading-${step}`, `--line-height-${step}`, `${size.name}--line-height`]
    return vars.find(v => names.includes(v.name))
  }
  const leadings = new Set(sizes.map(leadingOf))
  return {
    elements,
    families: of('family'),
    sizes,
    weights,
    other: of('other').filter(v => !leadings.has(v)),
    weightOf,
    leadingOf,
  }
}

// Variable-font systems ship weights as axis settings (`"wght" 450, "opsz" 15`).
function weightStyle(v: Var): CSSProperties {
  return v.value.includes('"wght"') ? { fontVariationSettings: `var(${v.name})` } : { fontWeight: `var(${v.name})` }
}

function sizeStyle(v: Var, weight?: Var, leading?: Var): CSSProperties {
  return {
    fontSize: `var(${v.name})`,
    ...(leading && { lineHeight: `var(${leading.name})` }),
    ...(weight && weightStyle(weight)),
  }
}

export function TypographyView({ vars }: { vars: Var[] }) {
  const { elements, families, sizes, weights, other, weightOf, leadingOf } = roles(vars)
  const paired = new Set(sizes.map(weightOf))
  const standalone = weights.filter(w => !paired.has(w))
  return (
    <>
      {families.length > 0 && (
        <TokenSection title="Families">
          <div data-modo="type-families">
            {families.map(v => (
              <Family key={v.name} v={v} weights={standalone} />
            ))}
          </div>
        </TokenSection>
      )}
      {sizes.length > 0 && (
        <TokenSection title="Scale">
          <div data-modo="type-scale">
            {[...sizes].reverse().map(v => (
              <Step key={v.name} v={v} weight={weightOf(v)} leading={leadingOf(v)} />
            ))}
          </div>
        </TokenSection>
      )}
      {elements.length > 0 && (
        <TokenSection title="Elements">
          <div data-modo="type-elements">
            {elements.map(e => (
              <ElementStep key={e} element={e} />
            ))}
          </div>
        </TokenSection>
      )}
      {standalone.length > 0 && (
        <TokenSection title="Weights">
          <div data-modo="type-weights">
            {standalone.map(v => (
              <div data-modo="type-weight" key={v.name}>
                <span data-modo="type-glyph" style={weightStyle(v)}>
                  Aa
                </span>
                <TokenLabel v={v} />
              </div>
            ))}
          </div>
        </TokenSection>
      )}
      <OtherTokens vars={other} />
    </>
  )
}

/** The family's name and glyphs, and the system's weights set in it. */
function Family({ v, weights: all }: { v: Var; weights: Var[] }) {
  const font = { fontFamily: `var(${v.name})` }
  // One per distinct weight: systems often alias them (`--weight-bold` → 700).
  const weights = all.filter((w, i) => all.findIndex(o => weightLabel(o) === weightLabel(w)) === i)
  return (
    <div data-modo="type-family">
      <div data-modo="type-family-head" style={font}>
        <span data-modo="type-glyph">Aa</span>
        <span data-modo="type-family-name">{primaryFamily(resolved(v.name, v.value))}</span>
      </div>
      <div data-modo="type-family-sample" style={font}>
        {GLYPHS.map(line => (
          <span key={line}>{line}</span>
        ))}
      </div>
      {weights.length > 0 && (
        <div data-modo="type-family-weights" style={font}>
          {weights.map(w => (
            <span key={w.name} data-modo="type-family-weight">
              <span style={weightStyle(w)}>Aa</span>
              <span data-modo="token-meta">{weightLabel(w)}</span>
            </span>
          ))}
        </div>
      )}
      <TokenLabel v={v} />
    </div>
  )
}

/** `600`, or the `wght` axis of a variable font's settings. */
function weightLabel(v: Var): string {
  const value = resolved(v.name, v.value)
  return value.match(/"wght"\s+([\d.]+)/)?.[1] ?? value
}

// The role as the chrome renders it: its --modo-* vars, defaults included.
function ElementStep({ element }: { element: ElementRole }) {
  const Tag = ELEMENTS[element]
  const metrics = ['font-size', 'line-height', 'font-weight']
    .map(p => resolved(`--modo-${p}-${element}`))
    .filter(Boolean)
    .join(' · ')
  return (
    <div data-modo="type-element">
      <div data-modo="token-label">
        <code>{element}</code>
        <span data-modo="token-meta">{metrics}</span>
      </div>
      <Tag
        data-modo="type-sample"
        style={{
          fontSize: `var(--modo-font-size-${element})`,
          lineHeight: `var(--modo-line-height-${element})`,
          fontWeight: `var(--modo-font-weight-${element})`,
          color: `var(--modo-color-${element})`,
        }}
      >
        {SAMPLE}
      </Tag>
    </div>
  )
}

/** One step of the scale: its sample at size, then size, leading and weight. */
function Step({ v, weight, leading }: { v: Var; weight?: Var; leading?: Var }) {
  const size = lengthOf(v)
  const metrics = [
    size === null ? v.value : `${px(size)} / ${rem(size)}`,
    leading && `leading ${resolved(leading.name, leading.value)}`,
    weight && `weight ${weightLabel(weight)}`,
  ].filter(Boolean)
  return (
    <div data-modo="type-step">
      <code>{v.name}</code>
      <p data-modo="type-sample" style={sizeStyle(v, weight, leading)}>
        {SAMPLE}
      </p>
      <div data-modo="type-metrics">
        {metrics.map(m => (
          <span key={m}>{m}</span>
        ))}
      </div>
    </div>
  )
}

/** A family's glyph beside the scale climbing in it, for the Foundations overview. */
export function TypographyPreview({ vars }: { vars: Var[] }) {
  const { families, sizes, weightOf, leadingOf } = roles(vars)
  const family = families[0]
  return (
    <div data-modo="type-preview" style={family && { fontFamily: `var(${family.name})` }}>
      <span data-modo="type-glyph">Aa</span>
      <div data-modo="type-preview-lines">
        {spread([...sizes].reverse(), 4).map(v => (
          <span key={v.name} data-modo="type-preview-line" style={sizeStyle(v, weightOf(v), leadingOf(v))}>
            {SHORT_SAMPLE}
          </span>
        ))}
        {sizes.length === 0 &&
          families.map(f => (
            <span key={f.name} data-modo="type-preview-line" style={{ fontFamily: `var(${f.name})` }}>
              {primaryFamily(resolved(f.name, f.value))}
            </span>
          ))}
      </div>
    </div>
  )
}
