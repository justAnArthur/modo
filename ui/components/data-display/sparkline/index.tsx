/*
 * Local addition (not part of Fluid Functionalism): a small trend line for a
 * series of numbers, drawn as one SVG on `currentColor` and the status hues.
 * The viewBox stretches to the element (`preserveAspectRatio="none"`) while
 * the stroke keeps its width (`vector-effect: non-scaling-stroke`), so the
 * points present always span the full width. Nothing animates: a new point
 * re-renders the path.
 */

'use client'

import { forwardRef } from 'react'
import { type SizeVariant, useSize } from '../../../lib/size-context'
import { cn } from '../../../lib/utils'

type SparklineTone = 'current' | 'muted' | 'info' | 'success' | 'warning' | 'error'

// Literal tables: UnoCSS only generates the classes it can read whole.
const TONE: Record<SparklineTone, string> = {
  current: '',
  muted: 'text-muted-foreground',
  info: 'text-status-info',
  success: 'text-status-success',
  warning: 'text-status-warning',
  error: 'text-status-error',
}
const HEIGHT: Record<SizeVariant, string> = { default: 'h-6', compact: 'h-5' }

// The viewBox; the SVG stretches it to whatever box the element gets.
const W = 100
const H = 100

function points(series: number[], max: number): string {
  const step = W / (series.length - 1)
  return series.map((v, i) => `${i * step},${H - Math.min(Math.max(v / max, 0), 1) * H}`).join(' ')
}

interface SeriesProps {
  series: number[]
  max: number
  tone: SparklineTone
  area: boolean
}

function Series({ series, max, tone, area }: SeriesProps) {
  const line = points(series, max)

  return (
    <g className={TONE[tone]}>
      {area && <polygon points={`0,${H} ${line} ${W},${H}`} className="fill-current/16" />}
      <polyline
        points={line}
        fill="none"
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
        className="stroke-current"
      />
    </g>
  )
}

interface SparklineProps {
  /** The series, oldest first. Its points span the full width however many there are. */
  values: number[]
  /** A second series drawn under the first on the same scale, such as network out beside network in. */
  secondary?: number[]
  /** The value at the top edge. Defaults to the largest value of both series. */
  max?: number
  /** What the line shows, read by screen readers as its name: say the latest value in it. */
  label: string
  /** The first series' color: the surrounding text color, or a status hue. Defaults to `'current'`. */
  tone?: SparklineTone
  /** The second series' color. Defaults to `'muted'`. */
  secondaryTone?: SparklineTone
  /** Fills under each line with a 16% wash of its color. Defaults to `false`. */
  area?: boolean
  /** Pins the height to one step of the size ladder (24px default, 20px compact). Defaults to the surrounding SizeProvider. */
  size?: SizeVariant
  /** Classes for the SVG: a width (it fills its container by default), a text color. */
  className?: string
}

/**
 * A small inline trend line for a series of numbers: CPU, memory, network
 * traffic, request rates.
 *
 * The points present always stretch across the full width, so a short
 * history reads as a whole line rather than a stub at one end, and the
 * line keeps its stroke whatever box it gets. The scale runs from 0 to
 * `max`, or to the largest value when there is none. A `secondary` series
 * shares the scale in its own tone, and `area` washes under each line.
 * Until a series has two points it shows a flat baseline.
 *
 * It draws in the first render with nothing to measure, so it renders on
 * the server, and a new point simply redraws the path: nothing animates,
 * so a line fed every second costs no frames in between. Its `label` is
 * its accessible name.
 *
 * @example {@include ./examples.mdx}
 */
const Sparkline = forwardRef<SVGSVGElement, SparklineProps>(
  (
    {
      values,
      secondary,
      max: maxProp,
      label,
      tone = 'current',
      secondaryTone = 'muted',
      area = false,
      size: sizeProp,
      className,
    },
    ref,
  ) => {
    const size = useSize(sizeProp)
    const max = maxProp ?? Math.max(...values, ...(secondary ?? []))
    const scale = max > 0 ? max : 1
    const drawn = values.length > 1

    return (
      <svg
        ref={ref}
        role="img"
        aria-label={label}
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className={cn('block w-full shrink-0 overflow-visible', HEIGHT[size.variant], className)}
      >
        {secondary && secondary.length > 1 && (
          <Series series={secondary} max={scale} tone={secondaryTone} area={area} />
        )}
        {drawn ? (
          <Series series={values} max={scale} tone={tone} area={area} />
        ) : (
          <line
            x1="0"
            y1={H}
            x2={W}
            y2={H}
            strokeWidth="1.5"
            vectorEffect="non-scaling-stroke"
            className="stroke-current text-border"
          />
        )}
      </svg>
    )
  },
)

Sparkline.displayName = 'Sparkline'

export type { SparklineProps, SparklineTone }
export { Sparkline }

export default Sparkline
