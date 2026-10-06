import { OtherTokens, TokenLabel, TokenSection, type Var } from './token-row'

// The CSS keywords as the curves they stand for.
const KEYWORDS: Record<string, string> = {
  ease: '0.25, 0.1, 0.25, 1',
  'ease-in': '0.42, 0, 1, 1',
  'ease-out': '0, 0, 0.58, 1',
  'ease-in-out': '0.42, 0, 0.58, 1',
  linear: '0, 0, 1, 1',
}

const ms = (v: Var) => (v.swatch?.kind === 'duration' ? v.swatch.ms : 0)
// A duration's share of the longest; all-zero durations share equally.
const share = (v: Var, longest: Var) => (ms(longest) ? ms(v) / ms(longest) : 1)
const isEasing = (v: Var) => Object.hasOwn(KEYWORDS, v.value) || /^(cubic-bezier|linear|steps)\(/.test(v.value)

function kinds(vars: Var[]) {
  const durations = vars.filter(v => v.swatch?.kind === 'duration').sort((a, b) => ms(a) - ms(b))
  return {
    durations,
    easings: vars.filter(isEasing),
    other: vars.filter(v => v.swatch?.kind !== 'duration' && !isEasing(v)),
    longest: durations.at(-1),
  }
}

export function MotionView({ vars }: { vars: Var[] }) {
  const { durations, easings, other, longest } = kinds(vars)
  return (
    <>
      {durations.length > 0 && (
        <TokenSection title="Durations">
          <p data-modo="token-meta">Hover a row to play it.</p>
          <div data-modo="motion-list">
            {durations.map(v => (
              <MotionRow key={v.name} v={v} duration={v} extent={share(v, longest!)} />
            ))}
          </div>
        </TokenSection>
      )}
      {easings.length > 0 && (
        <TokenSection title="Easing">
          {longest ? <p data-modo="token-meta">Hover a row to play it over {longest.name}.</p> : null}
          <div data-modo="motion-list">
            {easings.map(v => (
              <MotionRow key={v.name} v={v} duration={longest} easing={v} />
            ))}
          </div>
        </TokenSection>
      )}
      <OtherTokens vars={other} />
    </>
  )
}

/** The dot crosses its track over `duration` along `easing` while the row is
    hovered. A duration's track is as long as its share of the longest one. */
function MotionRow({ v, duration, easing, extent }: { v: Var; duration?: Var; easing?: Var; extent?: number }) {
  return (
    <div data-modo="motion-row">
      <TokenLabel v={v} />
      {easing ? <Curve value={easing.value} /> : null}
      <div data-modo="motion-track" style={extent === undefined ? undefined : { inlineSize: `${extent * 100}%` }}>
        <span
          data-modo="motion-dot"
          style={{
            transitionDuration: duration && `var(${duration.name})`,
            transitionTimingFunction: easing && `var(${easing.name})`,
          }}
        />
      </div>
    </div>
  )
}

function Curve({ value }: { value: string }) {
  const points = KEYWORDS[value] ?? value.match(/^cubic-bezier\(([^)]+)\)$/)?.[1]
  if (!points) return null
  const [x1 = 0, y1 = 0, x2 = 1, y2 = 1] = points.split(',').map(Number)
  return (
    <svg data-modo="motion-curve" viewBox="0 0 1 1" aria-hidden="true">
      <path d={`M0 1C${x1} ${1 - y1} ${x2} ${1 - y2} 1 0`} />
    </svg>
  )
}

/** Durations as a timeline, for the Foundations overview. */
export function MotionPreview({ vars }: { vars: Var[] }) {
  const { durations, longest } = kinds(vars)
  return (
    <div data-modo="motion-preview">
      {durations.slice(0, 6).map(v => (
        <div key={v.name} data-modo="motion-bar" style={{ inlineSize: `${share(v, longest!) * 100}%` }} />
      ))}
    </div>
  )
}
