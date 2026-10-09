/*
 * Local addition (not part of Fluid Functionalism): the scrolling option list
 * the date and time pickers stack beside their calendar (months, years,
 * hours, minutes), or lay out as a strip above it on a narrow panel.
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
  className?: string
}

/** Scrolls `list` so `item` sits in its middle, on whichever axis it scrolls. */
function centre(list: HTMLElement, item: HTMLElement, behavior: ScrollBehavior) {
  const l = list.getBoundingClientRect()
  const i = item.getBoundingClientRect()
  list.scrollTo({
    top: list.scrollTop + i.top - l.top - (l.height - i.height) / 2,
    left: list.scrollLeft + i.left - l.left - (l.width - i.width) / 2,
    behavior,
  })
}

/** For a row of columns: a hairline between neighbours. */
const dividedColumns = 'flex [&>*+*]:border-s [&>*]:border-border'

const STEP: Record<string, number> = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }

function ScrollColumn<T extends number | string>({
  label,
  options,
  value,
  onValueChange,
  inView,
  follow = value,
  orientation = 'vertical',
  className,
}: ScrollColumnProps<T>) {
  const listRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const pointerInside = useRef(false)
  const centred = useRef(false)
  const reduceMotion = useReduceMotion()
  const horizontal = orientation === 'horizontal'
  const hover = useFluidHover(containerRef, { axis: horizontal ? 'x' : 'y' })
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

  // A run of banded options reads as one band: only its ends are rounded.
  const banded = options.map(o => inView?.(o.value) ?? false)

  const tabStop = options.some(o => o.value === value) ? value : (follow ?? options[0]?.value)

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const items = [
      ...(containerRef.current?.querySelectorAll<HTMLButtonElement>('[role="option"]:not(:disabled)') ?? []),
    ]
    const at = items.indexOf(document.activeElement as HTMLButtonElement)
    const next =
      e.key === 'Home' ? 0 : e.key === 'End' ? items.length - 1 : STEP[e.key] ? at + (STEP[e.key] ?? 0) : undefined
    if (next === undefined) return
    e.preventDefault()
    const item = items[Math.max(0, Math.min(items.length - 1, next))]
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
        className={cn('relative flex p-1', horizontal ? 'w-max flex-row' : 'flex-col')}
      >
        <FluidHoverHighlight hover={hover} className={shape.bg} />
        {options.map((option, index) => (
          <ScrollColumnItem
            key={option.value}
            index={index}
            registerItem={hover.registerItem}
            option={option}
            selected={option.value === value}
            band={
              !banded[index]
                ? undefined
                : banded[index - 1]
                  ? banded[index + 1]
                    ? 'middle'
                    : 'end'
                  : banded[index + 1]
                    ? 'start'
                    : 'single'
            }
            horizontal={horizontal}
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
  tabStop,
  onSelect,
}: {
  index: number
  registerItem: (index: number, element: HTMLElement | null) => void
  option: ScrollColumnOption<T>
  selected: boolean
  band?: 'start' | 'middle' | 'end' | 'single'
  horizontal: boolean
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
        'relative z-[1] flex shrink-0 items-center justify-center px-2 tabular-nums whitespace-nowrap outline-none',
        'transition-[color,background-color] duration-fast focus-visible:ring-1 focus-visible:ring-focus-ring',
        'disabled:opacity-50 disabled:pointer-events-none',
        sizeClasses.segmentItem,
        sizeClasses.text,
        shape.item,
        band && 'bg-selected',
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
