/*
 * Local addition (not part of Fluid Functionalism): resizable split panes.
 * Panels share the group's space as flex-grow percentages, so a drag never
 * re-lays out anything but the two panels on either side of the handle; the
 * handle is a hairline that thickens on the fast spring while it is held.
 */

'use client'

import { motion } from 'motion/react'
import {
  Children,
  createContext,
  type ForwardRefExoticComponent,
  forwardRef,
  isValidElement,
  type KeyboardEvent,
  type PointerEvent,
  type ReactElement,
  type ReactNode,
  type RefAttributes,
  useContext,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useReduceMotion } from '../../../lib/reduced-motion'
import { spring } from '../../../lib/springs'
import { useControllableState } from '../../../lib/use-controllable-state'
import { cn } from '../../../lib/utils'

type ResizableDirection = 'horizontal' | 'vertical'

interface PanelLimits {
  min: number
  max: number
  collapsible: boolean
}

interface GroupState {
  id: string
  direction: ResizableDirection
  sizes: number[]
  limits: PanelLimits[]
  defaults: number[]
  step: number
  setSizes: (sizes: number[]) => void
  dragging: boolean
  setDragging: (dragging: boolean) => void
}

const ResizableGroupContext = createContext<GroupState | null>(null)
// The panel's index, or for a handle the index of the panel before it.
const ResizableIndexContext = createContext(0)

function useGroup() {
  const group = useContext(ResizableGroupContext)
  if (!group) throw new Error('Resizable.Panel and Resizable.Handle must sit inside a Resizable.')
  return group
}

const NO_LIMITS: PanelLimits = { min: 0, max: 100, collapsible: false }

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

/** A size the panel accepts: a collapsible panel dragged below half its minimum snaps shut. */
function constrain(size: number, limits: PanelLimits) {
  if (limits.collapsible && size < limits.min / 2) return 0
  return clamp(size, limits.min, limits.max)
}

/** Moves `delta` percent from the panel after handle `i` to the one before it, within both panels' limits. */
function resize(sizes: number[], i: number, delta: number, limits: PanelLimits[]) {
  const [a = 0, b = 0] = sizes.slice(i, i + 2)
  const [la = NO_LIMITS, lb = NO_LIMITS] = limits.slice(i, i + 2)
  const total = a + b
  const before = constrain(total - constrain(total - constrain(a + delta, la), lb), la)
  const next = [...sizes]
  next[i] = before
  next[i + 1] = total - before
  return next
}

/** Panels without a `defaultSize` share what the others leave. */
function defaultSizes(given: (number | undefined)[]) {
  const taken = given.reduce<number>((sum, size) => sum + (size ?? 0), 0)
  const open = given.filter(size => size === undefined).length
  return given.map(size => size ?? Math.max(0, 100 - taken) / open)
}

interface ResizablePanelProps {
  /** Initial share of the group, in percent. Panels without one share what the others leave. */
  defaultSize?: number
  /** Smallest share, in percent. Defaults to `0`. */
  minSize?: number
  /** Largest share, in percent. Defaults to `100`. */
  maxSize?: number
  /** Let the panel snap shut when dragged below half its `minSize`, and open again past it. Defaults to `false`. */
  collapsible?: boolean
  /** The panel's content. */
  children?: ReactNode
  /** Classes for the panel. */
  className?: string
}

function ResizablePanel({ children, className }: ResizablePanelProps) {
  const group = useGroup()
  const index = useContext(ResizableIndexContext)
  const reduced = useReduceMotion()
  const size = group.sizes[index] ?? 0

  return (
    <div
      id={`${group.id}-${index}`}
      data-resizable-panel=""
      data-collapsed={size === 0 ? '' : undefined}
      // A drag follows the pointer; a size set any other way (a key, a reset, a controlled toggle) tweens there.
      className={cn(
        'min-h-0 min-w-0 overflow-hidden',
        !group.dragging && !reduced && 'transition-[flex-grow] duration-moderate',
        className,
      )}
      style={{ flex: `${size} 1 0px` }}
    >
      {children}
    </div>
  )
}

interface ResizableHandleProps {
  /** Accessible name of the separator. Defaults to `'Resize'`. */
  label?: string
  /** Classes for the separator. */
  className?: string
}

function ResizableHandle({ label = 'Resize', className }: ResizableHandleProps) {
  const group = useGroup()
  const index = useContext(ResizableIndexContext)
  const reduced = useReduceMotion()
  const [hovered, setHovered] = useState(false)
  const drag = useRef<{ start: number; sizes: number[]; pxPerPercent: number } | null>(null)
  const [dragging, setOwnDragging] = useState(false)
  const setDragging = (next: boolean) => {
    setOwnDragging(next)
    group.setDragging(next)
  }
  const horizontal = group.direction === 'horizontal'
  const limits = group.limits[index] ?? NO_LIMITS
  const size = group.sizes[index] ?? 0

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return
    const panels = [...(e.currentTarget.parentElement?.children ?? [])].filter(el =>
      el.hasAttribute('data-resizable-panel'),
    )
    const px = panels.reduce((sum, el) => {
      const rect = el.getBoundingClientRect()
      return sum + (horizontal ? rect.width : rect.height)
    }, 0)
    e.currentTarget.setPointerCapture(e.pointerId)
    drag.current = { start: horizontal ? e.clientX : e.clientY, sizes: group.sizes, pxPerPercent: px / 100 }
    setDragging(true)
    e.preventDefault()
  }

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current
    if (!d?.pxPerPercent) return
    const delta = ((horizontal ? e.clientX : e.clientY) - d.start) / d.pxPerPercent
    group.setSizes(resize(d.sizes, index, delta, group.limits))
  }

  const onPointerUp = () => {
    drag.current = null
    setDragging(false)
  }

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const keys: Record<string, number> = horizontal
      ? { ArrowLeft: -group.step, ArrowRight: group.step }
      : { ArrowUp: -group.step, ArrowDown: group.step }
    let delta = keys[e.key]
    if (e.key === 'Home') delta = (limits.collapsible ? 0 : limits.min) - size
    if (e.key === 'End') delta = limits.max - size
    if (delta === undefined) return
    e.preventDefault()
    // A collapsed panel opens straight to its minimum on the first step out.
    const target = size === 0 && delta > 0 ? Math.max(limits.min, delta) : size + delta
    group.setSizes(resize(group.sizes, index, target - size, group.limits))
  }

  const active = hovered || dragging
  const transition = reduced ? { duration: 0 } : active ? spring.fast : spring.fast.exit

  return (
    // biome-ignore lint/a11y/useSemanticElements: a focusable window splitter is a div with role separator (WAI-ARIA APG)
    <div
      role="separator"
      tabIndex={0}
      aria-label={label}
      aria-orientation={horizontal ? 'vertical' : 'horizontal'}
      aria-controls={`${group.id}-${index}`}
      aria-valuenow={Math.round(size)}
      aria-valuemin={limits.collapsible ? 0 : limits.min}
      aria-valuemax={limits.max}
      data-dragging={dragging ? '' : undefined}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      onKeyDown={onKeyDown}
      onDoubleClick={() => group.setSizes(group.defaults)}
      className={cn(
        'group/handle relative z-10 flex shrink-0 touch-none items-center justify-center outline-none',
        horizontal ? 'w-px cursor-col-resize self-stretch' : 'h-px cursor-row-resize',
        className,
      )}
    >
      {/* The hit area reaches past the hairline, so the handle is easy to grab. */}
      <span
        aria-hidden="true"
        className={cn('absolute', horizontal ? 'inset-y-0 -inset-x-1' : 'inset-x-0 -inset-y-1')}
      />
      <motion.span
        aria-hidden="true"
        className={cn(
          'pointer-events-none transition-[background-color] duration-fast group-focus-visible/handle:bg-focus-ring',
          horizontal ? 'h-full w-px' : 'h-px w-full',
          active ? 'bg-muted-foreground' : 'bg-border',
        )}
        initial={false}
        animate={horizontal ? { scaleX: active ? 3 : 1 } : { scaleY: active ? 3 : 1 }}
        transition={transition}
      />
    </div>
  )
}

interface ResizableProps {
  /** Lay the panels out side by side or stacked. Defaults to `'horizontal'`. */
  direction?: ResizableDirection
  /** Controlled panel sizes in percent, one per panel in order. Pair with `onSizesChange`. */
  sizes?: number[]
  /** Called with every panel's size whenever a handle moves. */
  onSizesChange?: (sizes: number[]) => void
  /** Percent a handle moves per arrow key. Defaults to `5`. */
  step?: number
  /** `Resizable.Panel`s with a `Resizable.Handle` between each pair. */
  children: ReactNode
  /** Classes for the group. */
  className?: string
}

/**
 * Panes that split a region and resize by dragging the line between them.
 *
 * Each `Resizable.Panel` takes a share of the group in percent, with optional
 * limits; a `Resizable.Handle` between two panels moves space from one to the
 * other. The handle rests as a hairline and thickens while the pointer is on
 * it or holds it; the drag keeps going wherever the pointer travels. By
 * keyboard, arrows move it a step, Home and End take the panel before it to
 * its smallest and largest size, and a double-click puts every panel back to
 * its starting size. A collapsible panel snaps shut when dragged below half
 * its minimum. A drag follows the pointer; every other change of size (a
 * key, a reset, new controlled `sizes`, such as a toggle folding a pane)
 * glides there. Sizes work uncontrolled (each panel's `defaultSize`) or
 * controlled (`sizes` + `onSizesChange`). Groups nest: put a Resizable inside
 * a panel to split it the other way.
 *
 * Statics:
 * - `Resizable.Panel` — one pane: `defaultSize`, `minSize`, `maxSize`, `collapsible`.
 * - `Resizable.Handle` — the separator between two panels: `label`.
 *
 * @example {@include ./examples.mdx}
 */
const Resizable = forwardRef<HTMLDivElement, ResizableProps>(
  ({ direction = 'horizontal', sizes, onSizesChange, step = 5, children, className }, ref) => {
    const id = useId()
    const items = Children.toArray(children)
    const panels = items.filter(
      (child): child is ReactElement<ResizablePanelProps> => isValidElement(child) && child.type === ResizablePanel,
    )
    const limits = panels.map(({ props }) => ({
      min: props.minSize ?? 0,
      max: props.maxSize ?? 100,
      collapsible: props.collapsible ?? false,
    }))
    const sizeKey = panels.map(({ props }) => props.defaultSize).join()
    const defaults = useMemo(() => defaultSizes(panels.map(({ props }) => props.defaultSize)), [sizeKey])
    const [current, setCurrent] = useControllableState(sizes, defaults, onSizesChange)
    const [dragging, setDragging] = useState(false)
    const group = { id, direction, sizes: current, limits, defaults, step, setSizes: setCurrent, dragging, setDragging }

    let panel = -1
    const indexed = items.map(child => {
      if (!isValidElement(child)) return child
      if (child.type === ResizablePanel) panel++
      return (
        <ResizableIndexContext.Provider key={child.key} value={Math.max(panel, 0)}>
          {child}
        </ResizableIndexContext.Provider>
      )
    })

    return (
      <ResizableGroupContext.Provider value={group}>
        <div
          ref={ref}
          data-direction={direction}
          className={cn('flex h-full w-full min-h-0 min-w-0', direction === 'vertical' && 'flex-col', className)}
        >
          {indexed}
        </div>
      </ResizableGroupContext.Provider>
    )
  },
) as ForwardRefExoticComponent<ResizableProps & RefAttributes<HTMLDivElement>> & {
  Panel: typeof ResizablePanel
  Handle: typeof ResizableHandle
}

Resizable.Panel = ResizablePanel
Resizable.Handle = ResizableHandle

export type { ResizableDirection, ResizableHandleProps, ResizablePanelProps, ResizableProps }
export { Resizable, ResizableHandle, ResizablePanel }

export default Resizable
