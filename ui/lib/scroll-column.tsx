/*
 * Local addition (not part of Fluid Functionalism): the scrolling option list
 * the date and time pickers stack beside their calendar (months, years,
 * hours, minutes), or lay out as a strip above it on a narrow panel.
 * `layout="grid"` lays the options out several to a row (after utegsk/ui's
 * 0.14 grid picker), with the fluid hover on both axes and the arrow keys
 * moving by row and by column.
 */

import { type KeyboardEvent, type ReactNode, useEffect, useRef } from 'react'
import { FluidHoverHighlight } from './fluid-hover-highlight'
import { useReduceMotion } from './reduced-motion'
import { useShape } from './shape-context'
import { useSize } from './size-context'
import { useFluidHover, useRegisterFluidHoverItem } from './use-fluid-hover'
import { cn } from './utils'

interface ScrollColumnOption<T extends number | string> {
  value: T
  label: ReactNode
  disabled?: boolean
}

interface ScrollColumnProps<T extends number | string> {
  /** Accessible name of the list ("Month", "Hour"). */
  label: string
  options: ScrollColumnOption<T>[]
  /** The picked option: a dot and a heavier weight. */
  value: T | null
  onValueChange: (value: T) => void
  /** Options to band, as a scrollbar thumb would (the months the calendar shows). */
  inView?: (value: T) => boolean
  /** The option kept centred. Defaults to `value`. */
  follow?: T | null
  /** A column, or a strip on a narrow panel. Defaults to `'vertical'`. */
  orientation?: 'vertical' | 'horizontal'
  /** One option per row (or per column, as a strip), or a grid of `columns` options per row scrolling down. Defaults to `'list'`. */
  layout?: 'list' | 'grid'
  /** Options per row of a grid, 2 to 6. Defaults to `3`. */
  columns?: 2 | 3 | 4 | 5 | 6
  className?: string
}

const GRID_COLUMNS = {
  2: 'grid-cols-2',
  3: 'grid-cols-3',
  4: 'grid-cols-4',
  5: 'grid-cols-5',
  6: 'grid-cols-6',
} as const

/**
 * Scrolls `list` so `item` sits in its middle, on whichever axis it scrolls.
 * Measured in layout pixels: a panel still scaled by its opening morph
 * reports shrunken client rects.
 */
function centre(list: HTMLElement, item: HTMLElement, behavior: ScrollBehavior) {
  const l = list.getBoundingClientRect()
  const i = item.getBoundingClientRect()
  const sx = l.width / list.offsetWidth || 1
  const sy = l.height / list.offsetHeight || 1
  list.scrollTo({
    top: list.scrollTop + (i.top - l.top) / sy - (list.clientHeight - item.offsetHeight) / 2,
    left: list.scrollLeft + (i.left - l.left) / sx - (list.clientWidth - item.offsetWidth) / 2,
    behavior,
  })
}

/** For a row of columns: a hairline between neighbours. */
const dividedColumns = 'flex [&>*+*]:border-s [&>*]:border-border'

const STEP: Record<string, number> = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }

/** The step an arrow key takes: a grid's Up and Down move a whole row. */
const stepOf = (key: string, grid: boolean, columns: number) =>
  grid && (key === 'ArrowDown' || key === 'ArrowUp') ? (STEP[key] ?? 0) * columns : STEP[key]

function ScrollColumn<T extends number | string>({
  label,
  options,
  value,
  onValueChange,
  inView,
  follow = value,
  orientation = 'vertical',
  layout = 'list',
  columns = 3,
  className,
}: ScrollColumnProps<T>) {
  const listRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const pointerInside = useRef(false)
  const centred = useRef(false)
  const reduceMotion = useReduceMotion()
  const grid = layout === 'grid'
  const horizontal = !grid && orientation === 'horizontal'
  const hover = useFluidHover(containerRef, { axis: grid ? 'xy' : horizontal ? 'x' : 'y' })
  const shape = useShape()

  // Recentres only when the followed option (or the axis) changes.
  const axis = useRef(horizontal)
  useEffect(() => {
    const list = listRef.current
    const item = list?.querySelector<HTMLElement>(`[data-value="${follow}"]`)
    if (!list || !item || pointerInside.current) return
    // A jump when the list opens or turns: it lands on its option.
    const glide = centred.current && axis.current === horizontal && !reduceMotion
    centre(list, item, glide ? 'smooth' : 'instant')
    centred.current = true
    axis.current = horizontal
  }, [follow, horizontal])

  // A resize (the panel settling its width, a strip turning into a column)
  // moves the followed option off centre: put it back at once.
  const followed = useRef(follow)
  followed.current = follow
  useEffect(() => {
    const list = listRef.current
    if (!list) return
    const observer = new ResizeObserver(() => {
      const item = list.querySelector<HTMLElement>(`[data-value="${followed.current}"]`)
      if (item && !pointerInside.current) centre(list, item, 'instant')
    })
    observer.observe(list)
    return () => observer.disconnect()
  }, [])

  // A run of banded options reads as one band: only its ends are rounded (a grid's options band one by one).
  const banded = options.map(o => inView?.(o.value) ?? false)
  const bandOf = (index: number) => {
    if (!banded[index]) return undefined
    if (grid) return 'single'
    if (banded[index - 1]) return banded[index + 1] ? 'middle' : 'end'
    return banded[index + 1] ? 'start' : 'single'
  }

  const tabStop = options.some(o => o.value === value) ? value : (follow ?? options[0]?.value)

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const items = [...(containerRef.current?.querySelectorAll<HTMLButtonElement>('[role="option"]') ?? [])]
    const enabled = items.filter(item => !item.disabled)
    const step = stepOf(e.key, grid, columns)
    let item: HTMLButtonElement | undefined
    if (e.key === 'Home') item = enabled[0]
    else if (e.key === 'End') item = enabled.at(-1)
    else if (step) {
      // Past disabled options, in the key's direction; at an edge, the focus stays.
      let at = items.indexOf(document.activeElement as HTMLButtonElement) + step
      while (items[at]?.disabled) at += step
      item = items[at] ?? (document.activeElement as HTMLButtonElement)
    } else return
    e.preventDefault()
    item?.focus({ preventScroll: true })
    if (item && listRef.current) centre(listRef.current, item, reduceMotion ? 'instant' : 'smooth')
  }

  return (
    <div
      ref={listRef}
      role="listbox"
      aria-label={label}
      aria-orientation={orientation}
      onKeyDown={onKeyDown}
      onPointerEnter={() => {
        pointerInside.current = true
      }}
      onPointerLeave={() => {
        pointerInside.current = false
      }}
      className={cn(
        'scrollbar-hide [--scroll-fade-size:24px]',
        horizontal
          ? 'overflow-x-auto overflow-y-hidden scroll-fade-x'
          : 'overflow-y-auto overflow-x-hidden scroll-fade',
        className,
      )}
    >
      {/* biome-ignore lint/a11y/noStaticElementInteractions lint/a11y/useKeyWithClickEvents: the fluid hover tracks the pointer here; the options inside are the buttons. */}
      <div
        ref={containerRef}
        onMouseMove={hover.handlers.onMouseMove}
        onMouseEnter={hover.handlers.onMouseEnter}
        onMouseLeave={hover.handlers.onMouseLeave}
        onClick={hover.handlers.onClick}
        className={cn(
          'relative p-1',
          grid ? cn('grid', GRID_COLUMNS[columns]) : cn('flex', horizontal ? 'w-max flex-row' : 'flex-col'),
        )}
      >
        <FluidHoverHighlight hover={hover} className={shape.bg} />
        {options.map((option, index) => (
          <ScrollColumnItem
            key={option.value}
            index={index}
            registerItem={hover.registerItem}
            option={option}
            selected={option.value === value}
            band={bandOf(index)}
            horizontal={horizontal}
            grid={grid}
            tabStop={option.value === tabStop}
            onSelect={() => onValueChange(option.value)}
          />
        ))}
      </div>
    </div>
  )
}

function ScrollColumnItem<T extends number | string>({
  index,
  registerItem,
  option,
  selected,
  band,
  horizontal,
  grid,
  tabStop,
  onSelect,
}: {
  index: number
  registerItem: (index: number, element: HTMLElement | null) => void
  option: ScrollColumnOption<T>
  selected: boolean
  band?: 'start' | 'middle' | 'end' | 'single'
  horizontal: boolean
  grid: boolean
  tabStop: boolean
  onSelect: () => void
}) {
  const ref = useRef<HTMLButtonElement>(null)
  useRegisterFluidHoverItem(registerItem, index, ref)
  const shape = useShape()
  const sizeClasses = useSize()

  return (
    <button
      ref={ref}
      type="button"
      role="option"
      aria-selected={selected}
      tabIndex={tabStop ? 0 : -1}
      disabled={option.disabled}
      data-value={option.value}
      data-fluid-hover-index={index}
      onClick={onSelect}
      className={cn(
        'relative z-[1] flex items-center justify-center px-2 tabular-nums whitespace-nowrap outline-none',
        grid ? 'min-w-0' : 'shrink-0',
        'transition-[color,background-color] duration-fast focus-visible:ring-1 focus-visible:ring-focus-ring',
        'disabled:opacity-50 disabled:pointer-events-none',
        sizeClasses.segmentItem,
        sizeClasses.text,
        shape.item,
        // FF's tint for a passive region (Accordion's open row); the pick is Select's checked row.
        band && !selected && 'bg-accent/20 dark:bg-accent/12',
        selected && 'bg-active',
        band && band !== 'single' && 'rounded-none',
        band === 'start' && (horizontal ? 'rounded-s-lg' : 'rounded-t-lg'),
        band === 'end' && (horizontal ? 'rounded-e-lg' : 'rounded-b-lg'),
        selected ? 'text-foreground weight-semibold' : band ? 'text-foreground' : 'text-muted-foreground',
      )}
    >
      {selected && (
        <span aria-hidden className="absolute start-1 top-1/2 size-1 -translate-y-1/2 rounded-full bg-current" />
      )}
      {option.label}
    </button>
  )
}

export type { ScrollColumnOption, ScrollColumnProps }
export { dividedColumns, ScrollColumn }
