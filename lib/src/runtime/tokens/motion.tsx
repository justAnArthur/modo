import { useEffect, useState } from 'react'
import { OtherTokens, TokenLabel, TokenSection, type Var } from './token-row'

// The CSS keywords as the curves they stand for.
const KEYWORDS: Record<string, string> = {
  ease: '0.25, 0.1, 0.25, 1',
  'ease-in': '0.42, 0, 1, 1',
  'ease-out': '0, 0, 0.58, 1',
  'ease-in-out': '0.42, 0, 0.58, 1',
  linear: '0, 0, 1, 1',
}

/** The pause at each end of a crossing, so even a long duration reads as motion, then rest. */
const REST_MS = 900

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

const still = matchMedia('(prefers-reduced-motion: reduce)')

/** Flips between the track's two ends, unless the reader asked for reduced motion. */
function useCrossing(period: number): boolean {
  const [end, setEnd] = useState(false)
  useEffect(() => {
    if (still.matches) return
    const timer = setInterval(() => setEnd(e => !e), period)
    return () => clearInterval(timer)
  }, [period])
  return end
}

export function MotionView({ vars }: { vars: Var[] }) {
  const { durations, easings, other, longest } = kinds(vars)
  const end = useCrossing((longest ? ms(longest) : 0) + REST_MS)
  return (
    <>
      {durations.length > 0 && (
        <TokenSection title="Durations">
          <div data-modo="motion-list" data-end={end || undefined}>
            {durations.map(v => (
              <MotionRow key={v.name} v={v} duration={v} extent={share(v, longest!)} />
            ))}
          </div>
        </TokenSection>
      )}
      {easings.length > 0 && (
        <TokenSection title="Easing">
          {longest ? <p data-modo="token-meta">Each curve plays over {longest.name}.</p> : null}
          <div data-modo="motion-list" data-end={end || undefined}>
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

/** The dot crosses its track over `duration` along `easing`, back and forth.
    A duration's track is as long as its share of the longest one. */
function MotionRow({ v, duration, easing, extent }: { v: Var; duration?: Var; easing?: Var; extent?: number }) {
  return (
    <div data-modo="motion-row">
      <TokenLabel v={v} />
      {easing ? <Curve value={easing.value} /> : null}
      <div data-modo="motion-lane">
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
    </div>
  )
}

function Curve({ value }: { value: string }) {
  const points = KEYWORDS[value] ?? value.match(/^cubic-bezier\(([^)]+)\)$/)?.[1]
  if (!points) return null
  const [x1 = 0, y1 = 0, x2 = 1, y2 = 1] = points.split(',').map(Number)
  return (
    <svg data-modo="motion-curve" viewBox="0 0 1 1" aria-hidden="true">
      <path data-modo="motion-curve-axis" d="M0 1L1 0" />
      <path d={`M0 1C${x1} ${1 - y1} ${x2} ${1 - y2} 1 0`} />
    </svg>
  )
}

/** Easing curves and durations as a timeline, for the Foundations overview. */
export function MotionPreview({ vars }: { vars: Var[] }) {
  const { durations, easings, longest } = kinds(vars)
  return (
    <div data-modo="motion-preview">
      {easings.length > 0 && (
        <div data-modo="motion-curves">
          {easings.slice(0, 4).map(v => (
            <Curve key={v.name} value={v.value} />
          ))}
        </div>
      )}
      {durations.slice(0, 6).map(v => (
        <div key={v.name} data-modo="motion-bar" style={{ inlineSize: `${share(v, longest!) * 100}%` }} />
      ))}
    </div>
  )
}
