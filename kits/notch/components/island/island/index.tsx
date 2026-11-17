/*!
 * Local addition: the island of a notch app, the black outline that hangs
 * from the top edge and grows out of the hardware notch. Rebuilt from Just
 * Notch's runtime (`island/island.tsx`) as a presentational component: no
 * host, no activity store; state, geometry and content come in as props.
 */

'use client'

import { GooLayer } from '@justanarthur/modo-ui/lib/goo-indicator'
import { useReduceMotion } from '@justanarthur/modo-ui/lib/reduced-motion'
import { SurfaceProvider } from '@justanarthur/modo-ui/lib/surface-context'
import { useControllableState } from '@justanarthur/modo-ui/lib/use-controllable-state'
import { cn } from '@justanarthur/modo-ui/lib/utils'
import { AnimatePresence, animate, motion, useMotionValue, useTransform } from 'motion/react'
import { type MouseEvent, type ReactNode, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import {
  bubbleFor,
  type IslandGeometry,
  type IslandState,
  islandPath,
  type Shape,
  shapeFor,
  slotWidth,
} from '../../../lib/geometry'
import { IslandContext } from '../../../lib/island-context'
import {
  bubbleTransition,
  contentEnter,
  contentHidden,
  contentLeave,
  contentShown,
  shapeTransition,
} from '../../../lib/motion'

type CollapsedState = 'idle' | 'compact' | 'split'

const HOVER_INTENT_MS = 120
const HOVER_LEAVE_MS = 400
// Room below the outline while it moves, so the goo tier's overshoot isn't cut off.
const OVERSHOOT = 24
const GOO_BLUR = 6
const INTERACTIVE =
  'button, a, input, select, textarea, label, [role=slider], [role=switch], [role=tab], [role=menuitem], [contenteditable]'

const isCollapsed = (state: IslandState): state is CollapsedState =>
  state === 'idle' || state === 'compact' || state === 'split'

interface IslandProps {
  /** What it shows (controlled). */
  state?: IslandState
  /** What it shows at first (uncontrolled). Defaults to `'idle'`. */
  defaultState?: IslandState
  /** Called with the state a press, a hover or Escape asks for. */
  onStateChange?: (state: IslandState) => void
  /** Where Escape and leaving the open island go back to. Defaults to the last of `idle`, `compact` or `split` it showed. */
  collapsedState?: CollapsedState
  /** Opens after a short hover and closes a moment after the pointer leaves. Defaults to `false`. */
  expandOnHover?: boolean
  /** The hardware notch's width in px. Defaults to `185`. */
  notchWidth?: number
  /** The notch's height in px: the compact island's and the menu bar's. Defaults to `32`. */
  notchHeight?: number
  /** The open island's width in px; it shrinks to the room it has. Defaults to `720`. */
  panelWidth?: number
  /** The open island's height in px. Defaults to `240`. */
  panelHeight?: number
  /** The compact left wing: the activity's glyph (`compact` and `split`). */
  leading?: ReactNode
  /** The compact right wing: its live value (`compact` and `split`). */
  trailing?: ReactNode
  /** The second activity, in the bubble that melts off the island's right end (`split`). */
  minimal?: ReactNode
  /** The open island's content, from its top edge: leave the notch's height free for tabs (`expanded`). */
  expanded?: ReactNode
  /** The alert below the notch (`flash`), such as an IslandFlash. */
  flash?: ReactNode
  /** Names what the wings or the flash show; a new one swaps them with the blur, so one alert replacing another reads as new. Defaults to the state. */
  activity?: string
  /** The accessible name of the press that opens it. Defaults to `'Open the island'`. */
  label?: string
  /** Classes for the root, which spans its container's width. */
  className?: string
}

interface LayerProps {
  shape: Shape
  top?: number
  reduced: boolean
  interactive: boolean
  children: ReactNode
}

/** One presentation's content, swapped with the blur and scale. */
function Layer({ shape, top = 0, reduced, interactive, children }: LayerProps) {
  const hidden = reduced ? { opacity: 0 } : contentHidden
  return (
    <motion.div
      className={cn('absolute', interactive ? 'pointer-events-auto' : 'pointer-events-none')}
      style={{
        left: `calc(50% - ${shape.w / 2}px)`,
        top: 0,
        width: shape.w,
        height: shape.h,
        transformOrigin: '50% 0',
      }}
      initial={hidden}
      animate={reduced ? { opacity: 1 } : contentShown}
      exit={{ ...hidden, transition: contentLeave }}
      transition={contentEnter}
    >
      <div className="absolute inset-x-0 bottom-0" style={{ top }}>
        {children}
      </div>
    </motion.div>
  )
}

/**
 * The island of a notch app: one black outline that hangs from the top edge,
 * flows into it through concave shoulders and grows out of the hardware notch
 * as its activities need room.
 *
 * Five states. `idle` is the bare notch. `compact` widens into two wings for
 * an activity's `leading` glyph and `trailing` value. `split` keeps them and
 * melts a second activity's `minimal` bubble off the right end through
 * modo-ui's goo. `flash` drops below the notch for a moment's alert, and
 * `expanded` opens the panel, whose `expanded` content starts at the top
 * edge: leave the notch's height for an IslandTabs strip.
 *
 * The outline is one SVG path on motion values, so a change of state animates
 * without layout: growing on the target state's spring tier, shrinking on the
 * source's exit tween. The content swaps the way Apple's island does, the
 * leaving content blurring out as the arriving one sharpens and grows in;
 * under reduced motion the shape jumps and the content only fades. At rest
 * nothing is clipped or filtered: the clip runs only while the outline moves,
 * the goo only while the bubble detaches or rejoins.
 *
 * It is always true black (`fill-ink`), the color of the notch it grows from,
 * and its content takes modo-ui's dark scope one surface up, so a tile inside
 * reads as raised. Content reads the island's state and geometry with
 * `useIsland()`.
 *
 * A press on the island opens it (a press on a control inside it is the
 * control's); Escape, and with `expandOnHover` the pointer leaving, closes it
 * back to the state it came from. Controlled through `state` /
 * `onStateChange`, or uncontrolled from `defaultState`.
 *
 * @example {@include ./examples.mdx}
 */
export default function Island({
  state: stateProp,
  defaultState = 'idle',
  onStateChange,
  collapsedState,
  expandOnHover = false,
  notchWidth = 185,
  notchHeight = 32,
  panelWidth = 720,
  panelHeight = 240,
  leading,
  trailing,
  minimal,
  expanded,
  flash,
  activity,
  label = 'Open the island',
  className,
}: IslandProps) {
  const [state, setState] = useControllableState(stateProp, defaultState, onStateChange)
  const reduced = useReduceMotion()
  const root = useRef<HTMLDivElement>(null)
  const [room, setRoom] = useState<number>()

  useLayoutEffect(() => {
    const el = root.current
    if (!el) return
    setRoom(el.clientWidth)
    const observer = new ResizeObserver(([entry]) => entry && setRoom(entry.contentRect.width))
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const geometry: IslandGeometry = useMemo(
    () => ({ notch: { width: notchWidth, height: notchHeight }, panel: { width: panelWidth, height: panelHeight } }),
    [notchWidth, notchHeight, panelWidth, panelHeight],
  )
  const { notch } = geometry
  const shape = shapeFor(state, geometry, room)
  const split = state === 'split'
  const bubble = bubbleFor(shape, notch, split)

  const rest = useRef<CollapsedState>(isCollapsed(defaultState) ? defaultState : 'idle')
  if (isCollapsed(state)) rest.current = state
  const collapse = () => setState(collapsedState ?? rest.current)

  const w = useMotionValue(shape.w)
  const h = useMotionValue(shape.h)
  const radius = useMotionValue(shape.radius)
  const shoulder = useMotionValue(shape.shoulder)
  const bubbleX = useMotionValue(bubble.x)
  const bubbleR = useMotionValue(bubble.r)
  const [moving, setMoving] = useState(false)
  const [reserve, setReserve] = useState(shape.h)
  const [goo, setGoo] = useState<{ left: number; top: number; width: number; height: number } | null>(null)
  const [bubbleShown, setBubbleShown] = useState(split)

  const d = useTransform(() =>
    islandPath(0, { w: w.get(), h: h.get(), radius: radius.get(), shoulder: shoulder.get() }),
  )
  const clipPath = useTransform(() => {
    const side = `calc(50% - ${w.get() / 2}px)`
    const r = radius.get()
    return `inset(0px ${side} calc(100% - ${h.get()}px) ${side} round 0px 0px ${r}px ${r}px)`
  })
  const bodyX = useTransform(() => -w.get() / 2)
  const bodyY = useTransform(() => -radius.get())
  const bodyHeight = useTransform(() => h.get() + radius.get())
  const bubbleLeft = useTransform(() => bubbleX.get() - bubbleR.get())
  const bubbleTop = useTransform(() => notch.height / 2 - bubbleR.get())
  const bubbleSize = useTransform(() => bubbleR.get() * 2)

  const previous = useRef(state)
  const token = useRef(0)
  useLayoutEffect(() => {
    const from = previous.current
    previous.current = state
    const run = ++token.current
    const values = [w, h, radius, shoulder, bubbleX, bubbleR] as const
    const targets = [shape.w, shape.h, shape.radius, shape.shoulder, bubble.x, bubble.r]

    // A resize, or reduced motion: no travel.
    if (from === state || reduced) {
      for (const [i, value] of values.entries()) value.jump(targets[i]!)
      setMoving(false)
      setGoo(null)
      setBubbleShown(split)
      setReserve(shape.h)
      return
    }

    const transition = shapeTransition(from, state)
    const splitChanged = (from === 'split') !== split
    const bubbleMove = splitChanged ? bubbleTransition(split) : transition
    setMoving(true)
    setReserve(Math.max(h.get(), shape.h) + OVERSHOOT)
    if (splitChanged) {
      const half = Math.max(w.get(), shape.w) / 2
      const reach = Math.max(half, bubbleFor(shape, notch, true).x + bubble.r * 2)
      const top = Math.max(radius.get(), shape.radius)
      setGoo({ left: -reach, top: -top, width: reach * 2, height: Math.max(h.get(), shape.h) + top })
      if (split) setBubbleShown(true)
    }
    const controls = values.map((value, i) => animate(value, targets[i]!, i >= 4 ? bubbleMove : transition))
    void Promise.all(controls.map(c => c.finished)).then(() => {
      if (run !== token.current) return
      setMoving(false)
      setGoo(null)
      setBubbleShown(split)
      setReserve(shape.h)
    })
  }, [state, shape.w, shape.h, shape.radius, shape.shoulder, bubble.x, bubble.r, reduced])

  const hover = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => () => clearTimeout(hover.current), [])
  const intend = (open: boolean) => {
    if (!expandOnHover) return
    clearTimeout(hover.current)
    hover.current = setTimeout(
      () => {
        if (open && isCollapsed(state)) setState('expanded')
        if (!open && state === 'expanded') collapse()
      },
      open ? HOVER_INTENT_MS : HOVER_LEAVE_MS,
    )
  }

  const open = state === 'expanded'
  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && collapse()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  // A press that reached the island untouched by a control opens it.
  const onClick = (event: MouseEvent) => {
    if (open || event.defaultPrevented) return
    if (event.target instanceof Element && event.target.closest(INTERACTIVE)) return
    setState('expanded')
  }

  const slot = slotWidth(notch)
  const context = useMemo(
    () => ({ state, geometry, shape }),
    [state, geometry, shape.w, shape.h, shape.radius, shape.shoulder],
  )

  let content: ReactNode = null
  if (state === 'expanded' && expanded)
    content = (
      <Layer key="expanded" shape={shape} reduced={reduced} interactive>
        {expanded}
      </Layer>
    )
  else if (state === 'flash' && flash)
    content = (
      <Layer key={`flash:${activity ?? ''}`} shape={shape} top={notch.height} reduced={reduced} interactive>
        <div className="flex size-full items-center px-5 pb-1">
          <div className="min-w-0 flex-1">{flash}</div>
        </div>
      </Layer>
    )
  else if ((state === 'compact' || split) && (leading || trailing))
    content = (
      <Layer key={`wings:${activity ?? 'compact'}`} shape={shape} reduced={reduced} interactive={false}>
        <div className="absolute inset-y-0 left-0 flex items-center justify-center" style={{ width: slot }}>
          {leading}
        </div>
        <div className="absolute inset-y-0 right-0 flex items-center justify-center" style={{ width: slot }}>
          {trailing}
        </div>
      </Layer>
    )

  return (
    <IslandContext.Provider value={context}>
      {/* biome-ignore lint/a11y/noStaticElementInteractions: a press anywhere on the shape opens it; the button below is its keyboard path */}
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: the button below opens it from the keyboard */}
      <div
        ref={root}
        data-state={state}
        className={cn('pointer-events-none relative w-full overflow-hidden', className)}
        style={{ height: reserve }}
        onClick={onClick}
        onPointerEnter={() => intend(true)}
        onPointerLeave={() => intend(false)}
      >
        {goo && (
          <div aria-hidden className="absolute top-0 left-1/2">
            <GooLayer active blur={GOO_BLUR} box={goo} fill="bg-ink">
              <motion.div
                className="absolute top-0 left-0 bg-ink"
                style={{ x: bodyX, y: bodyY, width: w, height: bodyHeight, borderRadius: radius }}
              />
              <motion.div
                className="absolute top-0 left-0 rounded-full bg-ink"
                style={{ x: bubbleLeft, y: bubbleTop, width: bubbleSize, height: bubbleSize }}
              />
            </GooLayer>
          </div>
        )}

        <svg aria-hidden className="absolute top-0 left-1/2 overflow-visible" width="1" height="1">
          <g className="pointer-events-auto fill-ink">
            <motion.path d={d} />
            {bubbleShown && <motion.circle cx={bubbleX} cy={notch.height / 2} r={bubbleR} />}
          </g>
        </svg>

        {!open && (
          <button
            type="button"
            aria-label={label}
            aria-expanded={false}
            className="pointer-events-auto absolute top-0 cursor-pointer outline-none focus-visible:ring-1 focus-visible:ring-focus-ring"
            style={{
              left: `calc(50% - ${shape.w / 2}px)`,
              width: shape.w,
              height: shape.h,
              borderBottomLeftRadius: shape.radius,
              borderBottomRightRadius: shape.radius,
            }}
            onClick={() => setState('expanded')}
          />
        )}

        <motion.div
          className="dark pointer-events-none absolute inset-0 text-foreground"
          // 'none' at rest, not unset: motion keeps the last value it wrote.
          style={{ clipPath: moving ? clipPath : 'none' }}
        >
          <SurfaceProvider value={1}>
            <AnimatePresence initial={false}>{content}</AnimatePresence>
          </SurfaceProvider>
        </motion.div>

        {(split || bubbleShown) && (
          <motion.div
            className="dark pointer-events-auto absolute top-0 left-1/2 flex items-center justify-center text-foreground"
            style={{ x: bubbleLeft, y: notch.height / 2 - bubble.r, width: bubble.r * 2, height: bubble.r * 2 }}
          >
            <AnimatePresence initial={false}>
              {split && minimal && (
                <motion.div
                  key={activity ?? 'minimal'}
                  className="flex size-full items-center justify-center"
                  initial={reduced ? { opacity: 0 } : contentHidden}
                  animate={reduced ? { opacity: 1 } : contentShown}
                  exit={{ opacity: 0, transition: contentLeave }}
                  transition={contentEnter}
                >
                  {minimal}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </IslandContext.Provider>
  )
}

export type { CollapsedState, IslandProps }
export { Island }
