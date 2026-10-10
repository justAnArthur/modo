/*
 * Local addition (not part of Fluid Functionalism): the liquid indicator, the
 * morph style for everything that travels between items: a tab's active pill,
 * a switch thumb, the fluid hover highlight and merged selection backgrounds.
 * When the indicator leaves a rect it leaves a blob behind. The blob lingers
 * for a third of the spring, then follows to the back of the new rect,
 * shrinking, while the indicator springs on: the goo melts the two into one
 * stretched drop that lets go, or, on a long move, a drop and a droplet that
 * catches up. The filter runs only while a blob is alive; at rest nothing is
 * filtered.
 *
 * The goo is the morph engine's (`GOO_MATRIX` and `GOO_BLUR_RATIO` in
 * `lib/use-morph.ts`, after beUI's gooey popover and Sileo, notices
 * LICENSE.beui and LICENSE.sileo). `GooFilter` lays the source over the
 * thresholded blur, which only works for opaque fills: `bg-hover` and
 * `bg-active` are a few percent alpha, under the threshold. `GooLayer`
 * thresholds the shapes' coverage instead and fills the result with their own
 * token, read from their fill class, so translucent and opaque fills melt
 * alike.
 */

import { animate, motion, type Transition, useMotionValue, type ValueAnimationTransition } from 'motion/react'
import { type ReactNode, useId, useLayoutEffect, useRef, useState } from 'react'
import { useReduceMotion } from './reduced-motion'
import { spring } from './springs'
import type { ItemRect } from './use-fluid-hover'
import { GOO_BLUR_RATIO, GOO_MATRIX } from './use-morph'
import { cn } from './utils'

// Any coverage counts as solid before the blur, so a 4%-alpha fill melts like an opaque one.
const COVERAGE = '0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 255 0'
// The share of its cross size a retracting blob keeps: it thins into a neck instead of a point.
const NECK = 0.5

function union(a: ItemRect | null, b: ItemRect): ItemRect {
  if (!a) return b
  const left = Math.min(a.left, b.left)
  const top = Math.min(a.top, b.top)
  return {
    left,
    top,
    width: Math.max(a.left + a.width, b.left + b.width) - left,
    height: Math.max(a.top + a.height, b.top + b.height) - top,
  }
}

function pad(rect: ItemRect, by: number): ItemRect {
  return { left: rect.left - by, top: rect.top - by, width: rect.width + by * 2, height: rect.height + by * 2 }
}

function center(rect: ItemRect) {
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
}

/** A move worth a blob: the center travels more than half the indicator's size, not a resize in place. */
function travels(from: ItemRect, to: ItemRect) {
  const a = center(from)
  const b = center(to)
  return (
    Math.abs(b.x - a.x) > Math.min(from.width, to.width) / 2 ||
    Math.abs(b.y - a.y) > Math.min(from.height, to.height) / 2
  )
}

/**
 * Where the blob left at `from` goes: the back edge of `to` on each axis that
 * moved, so it follows the indicator and is absorbed, and a neck on the other.
 */
function retract(from: ItemRect, to: ItemRect): ItemRect {
  const axis = (start: number, size: number, toStart: number, toSize: number) => {
    const delta = toStart + toSize / 2 - (start + size / 2)
    if (Math.abs(delta) < 1) return [start + (size * (1 - NECK)) / 2, size * NECK] as const
    return [delta > 0 ? toStart : toStart + toSize, 0] as const
  }
  const [left, width] = axis(from.left, from.width, to.left, to.width)
  const [top, height] = axis(from.top, from.height, to.top, to.height)
  return { left, top, width, height }
}

function toTarget(rect: ItemRect) {
  return { x: rect.left, y: rect.top, width: rect.width, height: rect.height }
}

function blurOf(el: Element, rect: ItemRect) {
  const r = Number.parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0
  return Math.min(r, rect.width / 2, rect.height / 2) * GOO_BLUR_RATIO
}

interface GooLayerProps {
  /** Filter on: the shapes melt into one. Off at rest. */
  active: boolean
  /** Blur in px: the shapes' radius times `GOO_BLUR_RATIO`. */
  blur: number
  /** The layer's box in the container's coordinates, covering every shape; padded for the blur here. */
  box: ItemRect | null
  /** The shapes' classes (a bg token, a radius): the melted result is filled with their background. */
  fill: string
  /** The shapes, positioned in the container's coordinates. */
  children?: ReactNode
}

/** A box of shapes that melt into one while `active`. The filter's region follows the box, so keep it tight. */
export function GooLayer({ active, blur, box, fill, children }: GooLayerProps) {
  const id = `goo-${useId().replace(/:/g, '')}`
  const flood = useRef<SVGFEFloodElement>(null)
  const probe = useRef<HTMLDivElement>(null)
  const layer = box ? pad(box, blur * 3) : { left: 0, top: 0, width: 0, height: 0 }

  // Resolved each time the goo starts, so it follows the scheme.
  useLayoutEffect(() => {
    if (!active || !probe.current) return
    flood.current?.setAttribute('flood-color', getComputedStyle(probe.current).backgroundColor)
  }, [active])

  return (
    <>
      <svg aria-hidden className="absolute size-0">
        <filter id={id} x="-50%" y="-50%" width="200%" height="200%" colorInterpolationFilters="sRGB">
          <feColorMatrix in="SourceGraphic" values={COVERAGE} result="coverage" />
          <feGaussianBlur in="coverage" stdDeviation={blur} result="blur" />
          <feColorMatrix in="blur" values={GOO_MATRIX} result="goo" />
          <feFlood ref={flood} />
          <feComposite in2="goo" operator="in" />
        </filter>
      </svg>
      <div
        aria-hidden
        className="pointer-events-none absolute"
        // Geometry is the shapes' own; the filter is the effect itself, melting their token fill.
        style={{ ...layer, filter: active ? `url(#${id})` : undefined }}
      >
        {/* Zero-sized, so it paints nothing: it carries the fill token for the flood and maps the shapes back to the container's coordinates. */}
        <div ref={probe} className={cn(fill, 'absolute')} style={{ left: -layer.left, top: -layer.top }}>
          {children}
        </div>
      </div>
    </>
  )
}

interface Trail {
  id: number
  from: ItemRect
  to: ItemRect
}

interface GooIndicatorProps {
  /** The rect to sit on, in the container's coordinates (as `useFluidHover` measures them). */
  rect: ItemRect
  /** Where it first appears; it then travels to `rect`. Defaults to `rect`. */
  from?: ItemRect | null
  /** Fill and radius classes: a bg token and the shape's radius. */
  className?: string
  /** Shadow class. While it melts, the shapes are drawn again beneath the goo with it, since the filter flattens shadows. */
  shadow?: string
  /** The travel: a spring tier. `false` snaps (a reflow, reduced motion). Defaults to `spring.moderate`. */
  transition?: Transition | false
  /** Opacity of the whole indicator, faded on `spring.fast`. Defaults to `1`. */
  opacity?: number
}

/**
 * An indicator that travels between items with a liquid neck. Render it in the
 * items' `relative` container, beneath them: the items' text stays above it,
 * unfiltered.
 */
export function GooIndicator({
  rect,
  from,
  className,
  shadow,
  transition = spring.moderate,
  opacity = 1,
}: GooIndicatorProps) {
  const reduced = useReduceMotion()
  const start = from ?? rect
  const x = useMotionValue(start.left)
  const y = useMotionValue(start.top)
  const width = useMotionValue(start.width)
  const height = useMotionValue(start.height)
  const lead = useRef<HTMLDivElement>(null)
  const [trails, setTrails] = useState<Trail[]>([])
  const [blur, setBlur] = useState(0)
  const ids = useRef(0)
  const travel = transition === false || reduced ? false : transition
  const travelRef = useRef(travel)
  travelRef.current = travel
  const read = () => ({ left: x.get(), top: y.get(), width: width.get(), height: height.get() })

  // Only a new rect moves it: the transition is often an inline object.
  useLayoutEffect(() => {
    const move = travelRef.current as ValueAnimationTransition<number> | false
    const current = read()
    if (!move) {
      x.jump(rect.left)
      y.jump(rect.top)
      width.jump(rect.width)
      height.jump(rect.height)
      return
    }
    const goo = lead.current && travels(current, rect) ? blurOf(lead.current, current) : 0
    // Square shapes have no radius to melt with.
    if (goo >= 1) {
      setBlur(goo)
      setTrails(list => [...list, { id: ++ids.current, from: current, to: retract(current, rect) }])
    }
    animate(x, rect.left, move)
    animate(y, rect.top, move)
    animate(width, rect.width, move)
    animate(height, rect.height, move)
  }, [rect.left, rect.top, rect.width, rect.height])

  const melting = trails.length > 0
  const linger = travel ? { ...travel, delay: (travel.duration ?? 0) / 3 } : undefined
  const shape = cn('pointer-events-none absolute top-0 left-0', className)
  const box = trails.reduce<ItemRect>((all, trail) => union(all, trail.from), union(read(), rect))
  const drop = (trail: Trail) => setTrails(list => list.filter(t => t.id !== trail.id))

  return (
    <motion.div
      aria-hidden
      className="pointer-events-none absolute top-0 left-0"
      initial={false}
      animate={{ opacity }}
      transition={{ duration: spring.fast.duration }}
    >
      {shadow && (
        <>
          {/* Fading as it shrinks: the goo lets a sliver vanish, a crisp shadow would not. */}
          {trails.map(trail => (
            <motion.div
              key={trail.id}
              className={cn(shape, shadow)}
              initial={{ ...toTarget(trail.from), opacity: 1 }}
              animate={{ ...toTarget(trail.to), opacity: 0 }}
              transition={linger}
            />
          ))}
          <motion.div className={cn(shape, shadow, !melting && 'invisible')} style={{ x, y, width, height }} />
        </>
      )}
      <GooLayer active={melting} blur={blur} box={box} fill={className ?? ''}>
        {trails.map(trail => (
          <motion.div
            key={trail.id}
            className={shape}
            initial={toTarget(trail.from)}
            animate={toTarget(trail.to)}
            transition={linger}
            onAnimationComplete={() => drop(trail)}
          />
        ))}
        {/* At rest it wears its own shadow; melting, a shadow would count as coverage and swell the goo. */}
        <motion.div ref={lead} className={cn(shape, !melting && shadow)} style={{ x, y, width, height }} />
      </GooLayer>
    </motion.div>
  )
}

export type { GooIndicatorProps, GooLayerProps }
export { union }
