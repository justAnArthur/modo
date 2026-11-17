/*!
 * Ported from Fluid Functionalism — github.com/mickadesign/fluid-functionalism
 * `app/docs/fluid-hover/page.tsx` + `app/docs/fluid-hover/demos.tsx` @ b3587bdbd83fc66c2a6aae3817ffb856cb09260b
 * MIT License © 2026 Micka Touillaud — fluidfunctionalism.com (notice: LICENSE.fluid-functionalism)
 * Local changes: see PORTING.md.
 */

'use client'

import {
  createContext,
  type ForwardRefExoticComponent,
  forwardRef,
  type HTMLAttributes,
  type ReactNode,
  type RefAttributes,
  useContext,
  useMemo,
  useRef,
} from 'react'
import { FluidHoverHighlight } from '../../../lib/fluid-hover-highlight'
import { mergeRefs } from '../../../lib/merge-refs'
import { IndexedRows, useRowIndex } from '../../../lib/row-index'
import { useShape } from '../../../lib/shape-context'
import { useFluidHover, useRegisterFluidHoverItem } from '../../../lib/use-fluid-hover'
import { cn } from '../../../lib/utils'

type FluidHoverAxis = 'x' | 'y' | 'xy'

interface FluidHoverContextValue {
  registerItem: (index: number, element: HTMLElement | null) => void
  axis: FluidHoverAxis
  disabledIndices: ReadonlySet<number>
}

const FluidHoverContext = createContext<FluidHoverContextValue | null>(null)

function isItemDisabled(element: HTMLElement) {
  return element.hasAttribute('data-disabled')
}

const itemBaseClass =
  'relative z-10 flex shrink-0 cursor-pointer items-center text-left text-body text-foreground outline-none focus-visible:ring-1 focus-visible:ring-focus-ring'

const itemAxisClass: Record<FluidHoverAxis, string> = {
  y: 'h-9 w-full px-3',
  x: 'h-9 justify-center whitespace-nowrap px-3',
  xy: 'min-h-20 w-full flex-col items-start justify-center gap-0.5 p-3',
}

const containerAxisClass: Record<FluidHoverAxis, string> = {
  y: 'flex flex-col gap-1',
  x: 'flex flex-row gap-1',
  xy: 'grid gap-1',
}

interface FluidHoverItemProps extends HTMLAttributes<HTMLButtonElement> {
  /** Position in the list. Defaults to the row's place among `FluidHover`'s children. */
  index?: number
  /** Skips the row: never lit, never the target of a gap click. It stays registered, so its neighbours keep their indices. Defaults to whether `disabledIndices` lists it. */
  disabled?: boolean
  /** The row's content — a label, or an icon plus text, or (on `xy`) a title over a description. */
  children?: ReactNode
  /** Classes for the row, merged over the per-axis defaults. */
  className?: string
}

/**
 * One row of a fluid hover list: a real button, focusable and activatable from
 * the keyboard, announced by its label. It registers itself with the
 * surrounding `FluidHover` for as long as it is mounted; outside one it is
 * just a button.
 */
const FluidHoverItem = forwardRef<HTMLButtonElement, FluidHoverItemProps>(
  ({ index: indexProp, disabled: disabledProp, className, children, ...props }, ref) => {
    const list = useContext(FluidHoverContext)
    const shape = useShape()
    const innerRef = useRef<HTMLButtonElement | null>(null)
    const index = useRowIndex(indexProp)
    const disabled = disabledProp ?? list?.disabledIndices.has(index) ?? false
    useRegisterFluidHoverItem(list?.registerItem, index, innerRef)
    const axis = list?.axis ?? 'y'
    return (
      <button
        ref={mergeRefs(innerRef, ref)}
        type="button"
        data-slot="fluid-hover-item"
        // Read by `isItemDisabled` on every move, so the list needn't re-measure.
        data-disabled={disabled || undefined}
        disabled={disabled}
        {...props}
        className={cn(
          itemBaseClass,
          itemAxisClass[axis],
          shape.item,
          disabled && 'cursor-default text-muted-foreground opacity-55',
          className,
        )}
      >
        {children}
      </button>
    )
  },
)

FluidHoverItem.displayName = 'FluidHoverItem'

interface FluidHoverProps extends HTMLAttributes<HTMLDivElement> {
  /** Which way the list runs: `'y'` for lists, `'x'` for strips, `'xy'` for grids. Defaults to `'y'`, or `'xy'` when `columns` is above 1. */
  axis?: FluidHoverAxis
  /** Grid columns. Above 1 the container becomes a grid and resolves the nearest item across rows and columns. Defaults to `1`, or `2` when `axis` is `'xy'`. */
  columns?: number
  /** Shorthand rows: one `FluidHover.Item` per string, indexed in order. Omit it and pass `FluidHover.Item` children instead. */
  items?: string[]
  /** Renders the content of a shorthand row. Defaults to the string itself. */
  renderItem?: (item: string, index: number) => ReactNode
  /** Rows to skip: never lit, never the target of a gap click. They stay registered, so their neighbours keep their indices. */
  disabledIndices?: number[]
  /** Whether a click that lands between rows goes to the lit one, so what is lit is what a click hits. `false` leaves empty space inert; `{ maxDistance }` routes only clicks within that many pixels of the lit row. Defaults to `true`. */
  gapClick?: boolean | { maxDistance?: number }
  /** Classes for the highlight itself — radius and z-index. Merged over `absolute bg-hover` and the shape system's radius. */
  highlightClassName?: string
  /** Classes for the list container. Padding here is part of the list: a click in it still lands on the lit row. */
  className?: string
  /** `FluidHover.Item` rows, when `items` is not enough. Children are indexed in order. */
  children?: ReactNode
}

type FluidHoverComponent = ForwardRefExoticComponent<FluidHoverProps & RefAttributes<HTMLDivElement>> & {
  Item: typeof FluidHoverItem
}

/**
 * Hover that never blinks and always follows your cursor to the nearest item.
 *
 * One rule, no dead zones: an item the pointer is inside wins, and otherwise
 * the item whose center is nearest does — so a cursor in a gap, in the
 * padding, or past the last row still lands on something, and a click there
 * lands on what is lit (`gapClick`). One list is one FluidHover: it owns the
 * container's mouse handlers, hands every row its index, and draws the single
 * highlight that melts between the measured rectangles, stretching toward the
 * next row and letting go (the liquid indicators in Morph).
 *
 * Three axes, one feel. `y` is for lists — menus, tables, radio rows — and
 * measures the vertical center; `x` is for strips — tabs, segmented controls —
 * and measures the horizontal one; `xy` is for card grids, where the nearest
 * card is the shortest straight line to a center across both rows and columns.
 * Pass `columns` and the container becomes that grid and picks `xy` on its own.
 *
 * Split a list at the divider. Rows that are alternatives to each other share
 * one list — children ride with their parent — and the highlight never crosses
 * into a different kind of thing: that is a second FluidHover. A disabled row
 * is skipped rather than unregistered (`disabledIndices`, or `disabled` on the
 * row), so the rows around it keep their indices and their measurements.
 *
 * It costs 1 transform and 1 loop per move: the pick is one pass
 * over cached rectangles per animation frame, with no DOM reads per row, and
 * the highlight travels on a transform. While it melts, a shrinking blob and
 * the goo filter join it, and both are gone once it settles, so a resting
 * highlight is filtered by nothing. Reduced motion (the OS setting or a
 * `MotionConfig`) keeps the fade onto the nearest row and drops the travel
 * between rows.
 *
 * Use it when everything in the list can be clicked (a menu, a list, tabs, a
 * grid of links), when the items sit close together, and when they stay where
 * they are while you look at them. Skip it when a wrong click would hurt, when
 * only some of the cards can be clicked, when there is a lot of empty space
 * around the items, or when rows change place as you scroll.
 *
 * Statics:
 * - `FluidHover.Item` — one row, rendered as a real button (focusable,
 *   activatable from the keyboard, announced by its label); the hook only
 *   lights it, it never moves focus.
 *
 * For a list this container cannot express, the machinery is re-exported
 * unchanged. `useFluidHover(containerRef, { axis, isItemDisabled, gapClick })`
 * returns `{ handlers, registerItem, activeIndex, setActiveIndex, itemRects,
 * isMeasured, remeasure, sessionRef }`: spread `handlers` on the container,
 * give each row `useRegisterFluidHoverItem(registerItem, index, ref)`, light a
 * row yourself with `setActiveIndex` for keyboard focus, and call `remeasure`
 * when the rects may be stale (a popup opening on rows that never unmounted).
 * `FluidHoverHighlight` then draws the fill: `hover` is the hook's return
 * value, `hidden` keeps the state but shows nothing, `from` is where a fresh
 * entry fades in (a dropdown passes its checked row), `className` carries
 * radius and z-index, and `transition` is the travel — `false` snaps into
 * place after a reflow instead of sliding.
 *
 * @example {@include ./examples.mdx}
 * @source https://github.com/mickadesign/fluid-functionalism/blob/b3587bdbd83fc66c2a6aae3817ffb856cb09260b/app/docs/fluid-hover/page.tsx Fluid Functionalism
 * @license MIT © 2026 Micka Touillaud
 */
const FluidHover = forwardRef<HTMLDivElement, FluidHoverProps>(
  (
    {
      axis,
      columns,
      items,
      renderItem,
      disabledIndices,
      gapClick = true,
      highlightClassName,
      className,
      children,
      style,
      ...props
    },
    ref,
  ) => {
    const containerRef = useRef<HTMLDivElement | null>(null)
    const shape = useShape()

    const resolvedAxis: FluidHoverAxis = axis ?? ((columns ?? 1) > 1 ? 'xy' : 'y')
    const resolvedColumns = resolvedAxis === 'xy' ? Math.max(1, columns ?? 2) : 1

    const hover = useFluidHover(containerRef, {
      axis: resolvedAxis,
      isItemDisabled,
      gapClick,
    })
    const { handlers, registerItem } = hover

    // Keyed on the indices' contents: an inline array is new every render.
    const disabledKey = disabledIndices?.join() ?? ''
    const contextValue = useMemo<FluidHoverContextValue>(
      () => ({ registerItem, axis: resolvedAxis, disabledIndices: new Set(disabledIndices) }),
      [registerItem, resolvedAxis, disabledKey],
    )

    // A child that is not an Item keeps its slot but never registers; the hit
    // test skips the hole it leaves.
    const rows = items
      ? items.map((item, i) => (
          <FluidHoverItem key={`${i}-${item}`}>{renderItem ? renderItem(item, i) : item}</FluidHoverItem>
        ))
      : children

    return (
      <FluidHoverContext.Provider value={contextValue}>
        <div
          ref={mergeRefs(containerRef, ref)}
          {...props}
          {...handlers}
          data-slot="fluid-hover"
          data-axis={resolvedAxis}
          className={cn('relative', containerAxisClass[resolvedAxis], className)}
          style={
            resolvedAxis === 'xy'
              ? {
                  gridTemplateColumns: `repeat(${resolvedColumns}, minmax(0, 1fr))`,
                  ...style,
                }
              : style
          }
        >
          <FluidHoverHighlight hover={hover} className={cn('z-0', shape.bg, highlightClassName)} />
          <IndexedRows>{rows}</IndexedRows>
        </div>
      </FluidHoverContext.Provider>
    )
  },
) as FluidHoverComponent

FluidHover.displayName = 'FluidHover'

Object.assign(FluidHover, { Item: FluidHoverItem })

export type { FluidHoverHighlightProps } from '../../../lib/fluid-hover-highlight'
export { FluidHoverHighlight } from '../../../lib/fluid-hover-highlight'
export type {
  ItemRect,
  UseFluidHoverOptions,
  UseFluidHoverReturn,
} from '../../../lib/use-fluid-hover'
export {
  useFluidHover,
  useRegisterFluidHoverItem,
} from '../../../lib/use-fluid-hover'
export type { FluidHoverAxis, FluidHoverItemProps, FluidHoverProps }
export { FluidHover, FluidHoverItem }

export default FluidHover
