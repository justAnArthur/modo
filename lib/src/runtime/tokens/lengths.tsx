import type { CSSProperties } from 'react'
import { lengthMeta, spread } from './format'
import { byLength, lengthOf, OtherTokens, TokenLabel, TokenSection, type Var } from './token-row'

/** Tallest step in the overview's staircase, in px; the rest scale with it. */
const STAIRS = 96
/** Padding specimens shown, evenly across the scale. */
const INSETS = 8

function sized(vars: Var[]) {
  const lengths = byLength(vars).map(v => ({ v, px: lengthOf(v) }))
  return {
    steps: lengths.filter(s => s.px !== null),
    other: lengths.filter(s => s.px === null).map(s => s.v),
  }
}

export function RadiusView({ vars }: { vars: Var[] }) {
  const { steps, other } = sized(vars)
  return (
    <>
      <TokenSection title="Scale">
        <div data-modo="radius-grid">
          {steps.map(({ v, px }) => {
            const radius = { borderRadius: `var(${v.name})` }
            return (
              <figure data-modo="radius-tile" key={v.name}>
                <div data-modo="radius-stage">
                  <div data-modo="radius-shape" style={radius} />
                  <div data-modo="radius-uses">
                    <span data-modo="radius-use" data-kind="control" style={radius} />
                    <span data-modo="radius-use" data-kind="card" style={radius} />
                  </div>
                </div>
                <TokenLabel v={v} meta={lengthMeta(v.value, px)} />
              </figure>
            )
          })}
        </div>
      </TokenSection>
      <OtherTokens vars={other} />
    </>
  )
}

/** Each radius as a single corner, for the Foundations overview. */
export function RadiusPreview({ vars }: { vars: Var[] }) {
  return (
    <div data-modo="radius-preview">
      {sized(vars)
        .steps.slice(0, 5)
        .map(({ v }) => (
          <span key={v.name} data-modo="radius-corner" style={{ borderStartStartRadius: `var(${v.name})` }} />
        ))}
    </div>
  )
}

export function SpacingView({ vars }: { vars: Var[] }) {
  const { steps, other } = sized(vars)
  const insets = spread(
    steps.filter(s => s.px! > 0),
    INSETS,
  )
  // Every ruler is as long as the largest step, so the bars share one scale.
  const largest = Math.max(...steps.map(s => s.px!), 0)
  return (
    <>
      <TokenSection title="Scale">
        <div data-modo="space-scale" style={{ '--modo-space-max': `${largest}px` } as CSSProperties}>
          {steps.map(({ v, px }) => (
            <div data-modo="space-step" key={v.name}>
              <TokenLabel v={v} meta={lengthMeta(v.value, px)} />
              <div data-modo="space-ruler">
                <div data-modo="space-bar" style={{ inlineSize: `var(${v.name})` }} />
              </div>
              <div data-modo="space-specimen" style={{ gap: `var(${v.name})` }}>
                <span />
                <span />
                <span />
              </div>
            </div>
          ))}
        </div>
      </TokenSection>
      {insets.length > 0 && (
        <TokenSection title="Padding">
          <div data-modo="space-insets">
            {insets.map(({ v }) => (
              <figure data-modo="space-inset" key={v.name}>
                <div data-modo="space-inset-box" style={{ padding: `var(${v.name})` }}>
                  <span />
                </div>
                <code>{v.name}</code>
              </figure>
            ))}
          </div>
        </TokenSection>
      )}
      <OtherTokens vars={other} />
    </>
  )
}

/** The scale as a staircase, the largest step STAIRS px tall. */
export function SpacingPreview({ vars }: { vars: Var[] }) {
  const { steps } = sized(vars)
  const largest = Math.max(...steps.map(s => s.px!), 1)
  return (
    <div data-modo="space-preview">
      {spread(steps, 12).map(({ v }) => (
        <span
          key={v.name}
          data-modo="space-stair"
          style={{ blockSize: `calc(var(${v.name}) * ${STAIRS / largest})` }}
        />
      ))}
    </div>
  )
}
