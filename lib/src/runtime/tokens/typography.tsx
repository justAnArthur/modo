import type { CSSProperties } from 'react'
import { byLength, OtherTokens, TokenLabel, TokenSection, type Var } from './token-row'

const SAMPLE = 'The quick brown fox jumps over the lazy dog'
const GLYPHS = ['ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz', '0123456789 !?&@#%']

type Role = 'family' | 'size' | 'weight' | 'other'

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

function roles(vars: Var[]) {
  const of = (r: Role) => vars.filter(v => role(v) === r)
  const weights = of('weight')
  return {
    families: of('family'),
    sizes: byLength(of('size')),
    weights,
    other: of('other'),
    /** A size's own weight, when the system pairs them (`--text-h1-weight`). */
    weightOf: (size: Var) => weights.find(w => w.name === `${size.name}-weight`),
  }
}

// Variable-font systems ship weights as axis settings (`"wght" 450, "opsz" 15`).
function weightStyle(v: Var): CSSProperties {
  return v.value.includes('"wght"') ? { fontVariationSettings: `var(${v.name})` } : { fontWeight: `var(${v.name})` }
}

function sizeStyle(v: Var, weight?: Var): CSSProperties {
  return { fontSize: `var(${v.name})`, ...(weight && weightStyle(weight)) }
}

export function TypographyView({ vars }: { vars: Var[] }) {
  const { families, sizes, weights, other, weightOf } = roles(vars)
  const paired = new Set(sizes.map(weightOf))
  const standalone = weights.filter(w => !paired.has(w))
  return (
    <>
      {families.length > 0 && (
        <TokenSection title="Families">
          <div data-modo="type-families">
            {families.map(v => (
              <Family key={v.name} v={v} />
            ))}
          </div>
        </TokenSection>
      )}
      {sizes.length > 0 && (
        <TokenSection title="Scale">
          <div data-modo="type-scale">
            {[...sizes].reverse().map(v => (
              <Step key={v.name} v={v} weight={weightOf(v)} />
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

function Family({ v }: { v: Var }) {
  const font = { fontFamily: `var(${v.name})` }
  return (
    <div data-modo="type-family">
      <span data-modo="type-glyph" style={font}>
        Aa
      </span>
      <div data-modo="type-family-sample" style={font}>
        {GLYPHS.map(line => (
          <span key={line}>{line}</span>
        ))}
      </div>
      <TokenLabel v={v} />
    </div>
  )
}

function Step({ v, weight }: { v: Var; weight?: Var }) {
  return (
    <div data-modo="type-step">
      <TokenLabel v={v}>{weight ? ` · ${weight.value}` : null}</TokenLabel>
      <p data-modo="type-sample" style={sizeStyle(v, weight)}>
        {SAMPLE}
      </p>
    </div>
  )
}

/** The scale climbing in the first family, for the Foundations overview. */
export function TypographyPreview({ vars }: { vars: Var[] }) {
  const { families, sizes, weightOf } = roles(vars)
  const family = families[0]
  return (
    <div data-modo="type-preview" style={family && { fontFamily: `var(${family.name})` }}>
      {sizes.length === 0 ? (
        <span data-modo="type-glyph">Aa</span>
      ) : (
        spread(sizes, 5).map(v => (
          <span key={v.name} data-modo="type-glyph" style={sizeStyle(v, weightOf(v))}>
            Aa
          </span>
        ))
      )}
    </div>
  )
}

/** Up to `n` items evenly across the list, ends included. */
function spread<T>(list: T[], n: number): T[] {
  if (list.length <= n) return list
  return Array.from({ length: n }, (_, i) => list[Math.round((i * (list.length - 1)) / (n - 1))]!)
}
