/*!
 * Ported from Fluid Functionalism — github.com/mickadesign/fluid-functionalism
 * `registry/default/card.tsx` @ b3587bdbd83fc66c2a6aae3817ffb856cb09260b
 * MIT License © 2026 Micka Touillaud — fluidfunctionalism.com (notice: LICENSE.fluid-functionalism)
 * Local changes: see PORTING.md.
 */

'use client'

import {
  Children,
  createContext,
  forwardRef,
  type HTMLAttributes,
  isValidElement,
  useCallback,
  useMemo,
  useRef,
  useState,
} from 'react'
import { FluidHoverHighlight } from '../../../lib/fluid-hover-highlight'
import { mergeRefs } from '../../../lib/merge-refs'
import { IndexedRows } from '../../../lib/row-index'
import { useShape } from '../../../lib/shape-context'
import { useControllableState } from '../../../lib/use-controllable-state'
import { useFluidHover } from '../../../lib/use-fluid-hover'
import { cn } from '../../../lib/utils'

type CardOrientation = 'card' | 'inline'
type CardBorder = 'none' | 'outlined'

interface CardGroupContextValue {
  registerItem: (index: number, element: HTMLElement | null) => void
  activeIndex: number | null
  /** Indices of the selected cards: their neighbours drop the hairline that would cut across the fill. */
  selectedRows: ReadonlySet<number>
  markSelected: (index: number, selected: boolean) => void
  /** The group's selected value, when the group holds selection. */
  value: string | undefined
  select: (value: string) => void
  orientation: CardOrientation
  columns: number
  count: number
  separated: boolean
  divided: boolean
  outlined: boolean
}

const CardGroupContext = createContext<CardGroupContextValue | null>(null)

interface CardContextValue {
  emphasized: boolean
  orientation: CardOrientation
  clickable: boolean
  /** An inline card holding a CardImage stacks its text and actions in a column beside the image. */
  hasImage: boolean
}

const CardContext = createContext<CardContextValue>({
  emphasized: false,
  orientation: 'card',
  clickable: false,
  hasImage: false,
})

interface CardGroupProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onDrag'> {
  /** How each card lays its content out: `"card"` stacks it (media and header on top), `"inline"` is a row (leading media, trailing footer), like a Table row. Defaults to `"card"`. */
  orientation?: CardOrientation
  /** Number of grid columns. Above 1 the fluid hover works across rows and columns. Defaults to `1`. */
  columns?: number
  /** `"none"` separates cards by hairlines only; `"outlined"` draws a frame: one shared frame, or one per card when `separated`. Defaults to `"none"`. */
  border?: CardBorder
  /** Splits the group into separate tiles with a gap between them instead of one divided block. Defaults to `false`. */
  separated?: boolean
  /** The magnetic fluid hover highlight. Defaults to `true`. */
  fluidHover?: boolean
  /** The selected card's `value` (controlled). A card with a `value` selects itself when clicked. */
  value?: string
  /** The initially selected card's `value` (uncontrolled). */
  defaultValue?: string
  /** Called with a card's `value` when it is clicked. */
  onValueChange?: (value: string) => void
}

const CardGroup = forwardRef<HTMLDivElement, CardGroupProps>(
  (
    {
      orientation = 'card',
      columns = 1,
      border = 'none',
      separated = false,
      fluidHover = true,
      value: valueProp,
      defaultValue,
      onValueChange,
      className,
      children,
      ...props
    },
    ref,
  ) => {
    const containerRef = useRef<HTMLDivElement>(null)
    const shape = useShape()
    // A card grid has generous whitespace, so a gap click only routes when it
    // lands within a hand's width of the highlighted card.
    const hover = useFluidHover(containerRef, { axis: columns > 1 ? 'xy' : 'y', gapClick: { maxDistance: 16 } })
    const { activeIndex, handlers, registerItem } = hover
    const [value, select] = useControllableState(valueProp, defaultValue, onValueChange)

    const [selectedRows, setSelectedRows] = useState<ReadonlySet<number>>(() => new Set())
    const markSelected = useCallback((index: number, selected: boolean) => {
      setSelectedRows(rows => {
        if (rows.has(index) === selected) return rows
        const next = new Set(rows)
        if (selected) next.add(index)
        else next.delete(index)
        return next
      })
    }, [])

    const count = Children.toArray(children).filter(isValidElement).length
    const outlined = border === 'outlined'
    const divided = !separated

    const contextValue = useMemo<CardGroupContextValue>(
      () => ({
        registerItem,
        activeIndex,
        selectedRows,
        markSelected,
        value,
        select,
        orientation,
        columns,
        count,
        separated,
        divided,
        outlined,
      }),
      [
        registerItem,
        activeIndex,
        selectedRows,
        markSelected,
        value,
        select,
        orientation,
        columns,
        count,
        separated,
        divided,
        outlined,
      ],
    )

    return (
      <CardGroupContext.Provider value={contextValue}>
        <div
          ref={mergeRefs(containerRef, ref)}
          {...props}
          data-slot="card-group"
          data-orientation={orientation}
          className={cn(
            'relative grid',
            // A shared frame clips the highlight and dividers to its corners; separated tiles clip themselves.
            outlined && !separated && `border border-border/60 overflow-hidden ${shape.container}`,
            separated ? 'gap-2' : 'gap-0',
            className,
          )}
          style={{ gridTemplateColumns: `repeat(${Math.max(1, columns)}, minmax(0, 1fr))` }}
          {...(fluidHover ? handlers : {})}
        >
          <FluidHoverHighlight hover={hover} hidden={!fluidHover} className={cn('z-0', shape.container)} />
          <IndexedRows>{children}</IndexedRows>
        </div>
      </CardGroupContext.Provider>
    )
  },
)

CardGroup.displayName = 'CardGroup'

export type { CardBorder, CardContextValue, CardGroupProps, CardOrientation }
export { CardContext, CardGroup, CardGroupContext }
