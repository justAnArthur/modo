/*
 * Ported from Fluid Functionalism — github.com/mickadesign/fluid-functionalism
 * `app/docs/fluid-hover/page.tsx` + `app/docs/fluid-hover/demos.tsx` @ b3587bdbd83fc66c2a6aae3817ffb856cb09260b
 * MIT License © 2026 Micka Touillaud — fluidfunctionalism.com (notice: LICENSE.fluid-functionalism)
 * Local modifications:
 * - Upstream ships fluid hover as a hook plus a highlight component, demoed on the
 *   docs page through local `FluidRow` / `CostRow` helpers. This item wraps that
 *   pair in one documented container (`FluidHover` + `FluidHover.Item`) so the modo
 *   examples can show all three axes without hooks. The mechanism is untouched and
 *   still lives in `lib/use-fluid-hover.ts` and
 *   `lib/fluid-hover-highlight.tsx`; both are re-exported here unchanged.
 * - `items`, `renderItem`, `disabledIndices`, `columns` and `highlightClassName` are
 *   this container's own API; `axis` and `gapClick` are the hook's options, passed
 *   straight through.
 * - Row classes are upstream's `rowClass` from `demos.tsx`, with per-axis variants
 *   for the strip and the grid; the highlight rides the shape system (`shape.bg`),
 *   as in upstream's `FluidHoverList`.
 * - Prose and examples follow the FF `/docs/fluid-hover` page (its five sections,
 *   minus the two scripted-cursor demos that only exist to film the mechanism).
 * - Styling reads DS tokens (AGENTS.md styling): `text-[Npx]` →
 *   `text-<role>[-compact]`; the hex focus-ring fallback →
 *   `ring-focus-ring` / `border-focus-ring`.
 */

import {
  Children,
  cloneElement,
  createContext,
  type ForwardRefExoticComponent,
  forwardRef,
  type HTMLAttributes,
  isValidElement,
  type MutableRefObject,
  type ReactElement,
  type ReactNode,
  type RefAttributes,
  useContext,
  useMemo,
  useRef,
} from 'react'
import { FluidHoverHighlight } from '../../lib/fluid-hover-highlight'
import { useShape } from '../../lib/shape-context'
import { useFluidHover, useRegisterFluidHoverItem } from '../../lib/use-fluid-hover'
import { cn } from '../../lib/utils'

// ---------------------------------------------------------------------------
// One list is one FluidHover: the container owns the mouse handlers, hands
// every row its index, and renders the single highlight that springs between
// the rects the hook measures. Rows are real buttons — the hook only lights
// them, it never moves focus.
//
// The escape hatch is the hook itself, re-exported at the bottom: a list this
// container cannot express (rows inside a virtualizer, a popup that stays
// mounted between opens, a highlight shared across two scopes) wires
// `useFluidHover` + `FluidHoverHighlight` by hand exactly as upstream does.
// ---------------------------------------------------------------------------

type FluidHoverAxis = 'x' | 'y' | 'xy'

interface FluidHoverContextValue {
  registerItem: (index: number, element: HTMLElement | null) => void
  axis: FluidHoverAxis
}

const FluidHoverContext = createContext<FluidHoverContextValue | null>(null)

/**
 * Skips a row without unregistering it, so the rows around it keep their
 * indices and their measurements. Both spellings land here: `disabled` on a
 * row and `disabledIndices` on the list set the same attribute.
 */
function isItemDisabled(element: HTMLElement) {
  return element.hasAttribute('data-disabled')
}

// Upstream's `rowClass` (demos.tsx), split into the shared part and the three
// axis shapes: a full-width row, a strip cell that keeps its content's width,
// and a grid tile that stacks a title over a description.
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

// ── FluidHover.Item ──────────────────────────────────────

interface FluidHoverItemProps extends HTMLAttributes<HTMLButtonElement> {
  /** Position in the list. Assigned automatically to direct children of `FluidHover`; pass it by hand for rows rendered inside a wrapper of your own. */
  index?: number
  /** Skips the row: never lit, never the target of a gap click. It stays registered, so its neighbours keep their indices. Defaults to `false`. */
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
  ({ index, disabled = false, className, children, ...props }, ref) => {
    const list = useContext(FluidHoverContext)
    const shape = useShape()
    const innerRef = useRef<HTMLButtonElement | null>(null)
    useRegisterFluidHoverItem(list?.registerItem, index, innerRef)
    const axis = list?.axis ?? 'y'
    return (
      <button
        ref={node => {
          innerRef.current = node
          if (typeof ref === 'function') ref(node)
          else if (ref) (ref as MutableRefObject<HTMLButtonElement | null>).current = node
        }}
        type="button"
        data-slot="fluid-hover-item"
        // Read back by `isItemDisabled` on every move: the hit test skips the
        // row without the list having to re-measure.
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

// ── FluidHover ───────────────────────────────────────────

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
  /** `FluidHover.Item` rows, when `items` is not enough. Direct Item children are indexed in order. */
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
 * highlight that springs between the measured rectangles.
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
 * It costs 1 element, 1 transform and 1 loop per move: the pick is one pass
 * over cached rectangles per animation frame, with no DOM reads per row, and
 * the highlight travels on a transform, so its top, left, width and height are
 * never written while it moves. Reduced motion is honoured on its own, read
 * straight off the OS media query with no MotionConfig wrapper needed: the
 * highlight still fades in on the nearest row, it just stops sliding between
 * rows.
 *
 * Use it when everything in the list can be clicked (a menu, a list, tabs, a
 * grid of links), when the items sit close together, and when they stay where
 * they are while you look at them. Skip it when a wrong click would hurt, when
 * only some of the cards can be clicked, when there is a lot of empty space
 * around the items, or when rows change place as you scroll.
 *
 * Statics: FluidHover.Item — one row, rendered as a real button (focusable,
 * activatable from the keyboard, announced by its label); the hook only lights
 * it, it never moves focus.
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

    // `columns` is the grid: asking for more than one column is asking for the
    // 2-D pick, and asking for `xy` without a column count means two.
    const resolvedAxis: FluidHoverAxis = axis ?? (columns !== undefined && columns > 1 ? 'xy' : 'y')
    const resolvedColumns = resolvedAxis === 'xy' ? Math.max(1, columns ?? 2) : 1

    const hover = useFluidHover(containerRef, {
      axis: resolvedAxis,
      isItemDisabled,
      gapClick,
    })
    const { handlers, registerItem } = hover

    const contextValue = useMemo<FluidHoverContextValue>(
      () => ({ registerItem, axis: resolvedAxis }),
      [registerItem, resolvedAxis],
    )

    const disabled = new Set(disabledIndices)
    // Rows come either from `items` (the container renders them) or from
    // Item children (the container only hands them their index). A child that
    // is not an Item keeps its slot but never registers, and the hit test
    // skips the hole it leaves in the rects.
    const rows = items
      ? items.map((item, i) => (
          <FluidHoverItem key={`${i}-${item}`} index={i} disabled={disabled.has(i)}>
            {renderItem ? renderItem(item, i) : item}
          </FluidHoverItem>
        ))
      : Children.toArray(children).map((child, i) => {
          if (!isValidElement(child) || child.type !== FluidHoverItem) return child
          const row = child as ReactElement<FluidHoverItemProps>
          return cloneElement(row, {
            index: row.props.index ?? i,
            disabled: row.props.disabled ?? disabled.has(i),
          })
        })

    return (
      <FluidHoverContext.Provider value={contextValue}>
        <div
          ref={node => {
            containerRef.current = node
            if (typeof ref === 'function') ref(node)
            else if (ref) (ref as MutableRefObject<HTMLDivElement | null>).current = node
          }}
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
          {rows}
        </div>
      </FluidHoverContext.Provider>
    )
  },
) as FluidHoverComponent

FluidHover.displayName = 'FluidHover'

// Compound static: `<FluidHover.Item>` (typed by the FluidHoverComponent cast
// on the forwardRef above).
Object.assign(FluidHover, { Item: FluidHoverItem })

export type { FluidHoverHighlightProps } from '../../lib/fluid-hover-highlight'
export { FluidHoverHighlight } from '../../lib/fluid-hover-highlight'
export type {
  ItemRect,
  UseFluidHoverOptions,
  UseFluidHoverReturn,
} from '../../lib/use-fluid-hover'
// The mechanism itself, unchanged — for lists this container cannot express.
export {
  useFluidHover,
  useRegisterFluidHoverItem,
} from '../../lib/use-fluid-hover'
export type { FluidHoverAxis, FluidHoverItemProps, FluidHoverProps }
export { FluidHover, FluidHoverItem }

export default FluidHover
