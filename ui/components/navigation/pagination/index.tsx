/*
 * Local addition (not part of Fluid Functionalism): page navigation in the
 * system's motion language, from the Pagination template in the modo-ui skill
 * (`references/authoring.md`). The current page is a liquid indicator
 * (`lib/goo-indicator.tsx`) that melts from page to page, and one fluid hover
 * highlight runs along the strip. Extended with first / last buttons, a
 * jump-to-page field (`variant="input"`) and every label as a prop.
 */

'use client'

import { type KeyboardEvent, useEffect, useRef, useState } from 'react'
import { FluidHoverHighlight } from '../../../lib/fluid-hover-highlight'
import { GooIndicator } from '../../../lib/goo-indicator'
import { type IconName, useIcon } from '../../../lib/icon-context'
import { useShape } from '../../../lib/shape-context'
import { type SizeVariant, useSize } from '../../../lib/size-context'
import { useControllableState } from '../../../lib/use-controllable-state'
import {
  type ItemRect,
  type UseFluidHoverReturn,
  useFluidHover,
  useRegisterFluidHoverItem,
} from '../../../lib/use-fluid-hover'
import { cn } from '../../../lib/utils'
import { WeightLabel } from '../../../lib/weight-label'
import { SizeScope } from '../../../primitives/sizes'
import Button from '../../button'
import { Input } from '../../inputs/input'

// Literal tables: UnoCSS only generates the classes it can read whole.
const SQUARE = { default: 'min-w-9', compact: 'min-w-7' }
const FIELD = { default: 'w-14', compact: 'w-12' }

type Slot = number | 'gap'

type PaginationVariant = 'pages' | 'input'

/** The ends, the current page and its siblings, and a gap wherever pages are skipped. */
function slots(page: number, total: number, siblings: number): Slot[] {
  const shown = new Set([1, total])
  for (let p = page - siblings; p <= page + siblings; p++) if (p >= 1 && p <= total) shown.add(p)

  const result: Slot[] = []
  let previous = 0
  for (const p of [...shown].sort((a, b) => a - b)) {
    // A gap of one page shows that page: an ellipsis would be no shorter.
    if (p - previous === 2) result.push(p - 1)
    else if (p - previous > 2) result.push('gap')
    result.push(p)
    previous = p
  }
  return result
}

interface PageButtonProps {
  page: number
  index: number
  current: boolean
  lit: boolean
  disabled: boolean
  register: UseFluidHoverReturn['registerItem']
  onSelect: (page: number) => void
}

function PageButton({ page, index, current, lit, disabled, register, onSelect }: PageButtonProps) {
  const ref = useRef<HTMLButtonElement>(null)
  const size = useSize()
  const shape = useShape()
  useRegisterFluidHoverItem(register, index, ref)

  return (
    <button
      ref={ref}
      type="button"
      aria-current={current ? 'page' : undefined}
      disabled={disabled}
      onClick={() => onSelect(page)}
      className={cn(
        'relative z-10 flex cursor-pointer items-center justify-center px-2 tabular-nums outline-none transition-[opacity] duration-fast focus-visible:ring-1 focus-visible:ring-focus-ring disabled:pointer-events-none disabled:opacity-50',
        size.control,
        SQUARE[size.variant],
        shape.button,
      )}
    >
      <WeightLabel emphasized={current} lit={current || lit} className={size.text}>
        {page}
      </WeightLabel>
    </button>
  )
}

interface PageStripProps {
  current: number
  total: number
  siblings: number
  disabled: boolean
  onSelect: (page: number) => void
}

/** The page buttons: one fluid hover, a liquid current-page indicator. */
function PageStrip({ current, total, siblings, disabled, onSelect }: PageStripProps) {
  const size = useSize()
  const shape = useShape()
  const containerRef = useRef<HTMLDivElement>(null)
  const hover = useFluidHover(containerRef, { axis: 'x' })

  const list = slots(current, total, siblings)
  const pages = list.filter((slot): slot is number => slot !== 'gap')
  // A page change can re-key the strip; hold the last measured rect so the
  // indicator travels from where it was instead of blinking out mid-measure.
  const measured = hover.isMeasured ? hover.itemRects[pages.indexOf(current)] : undefined
  const lastRect = useRef<ItemRect | undefined>(measured)
  if (measured) lastRect.current = measured

  return (
    <div ref={containerRef} {...hover.handlers} className="relative flex items-center gap-1">
      {lastRect.current && (
        <GooIndicator rect={lastRect.current} className={cn('bg-accent', shape.bg)} opacity={disabled ? 0.5 : 1} />
      )}
      <FluidHoverHighlight hover={hover} hidden={disabled} className={shape.bg} />
      {list.map((slot, i) =>
        slot === 'gap' ? (
          <span
            key={`gap-${i}`}
            aria-hidden="true"
            className={cn(
              'flex items-center justify-center text-muted-foreground',
              size.control,
              SQUARE[size.variant],
              size.text,
            )}
          >
            …
          </span>
        ) : (
          <PageButton
            key={slot}
            page={slot}
            index={pages.indexOf(slot)}
            current={slot === current}
            lit={hover.activeIndex === pages.indexOf(slot)}
            disabled={disabled}
            register={hover.registerItem}
            onSelect={onSelect}
          />
        ),
      )}
    </div>
  )
}

interface PageFieldProps {
  current: number
  total: number
  disabled: boolean
  label: string
  onSelect: (page: number) => void
}

/** Jump to a page: type a number, Enter or leaving the field goes there, Escape puts the current page back. */
function PageField({ current, total, disabled, label, onSelect }: PageFieldProps) {
  const size = useSize()
  const [draft, setDraft] = useState(String(current))

  useEffect(() => setDraft(String(current)), [current])

  const commit = () => {
    const page = Number(draft)
    if (Number.isInteger(page) && page >= 1 && page <= total) onSelect(page)
    else setDraft(String(current))
  }

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') commit()
    if (event.key === 'Escape') setDraft(String(current))
  }

  return (
    <div className={cn('flex items-center', size.gap)}>
      <Input
        variant="bordered"
        inputMode="numeric"
        aria-label={label}
        value={draft}
        onValueChange={value => setDraft(value.replace(/\D/g, ''))}
        onKeyDown={onKeyDown}
        onBlur={commit}
        disabled={disabled || total <= 1}
        className={cn('tabular-nums', FIELD[size.variant])}
      />
      <span className={cn('whitespace-nowrap tabular-nums text-muted-foreground', size.text)}>/ {total}</span>
    </div>
  )
}

interface StepProps {
  icon: IconName
  label: string
  disabled: boolean
  onClick: () => void
}

function Step({ icon, label, disabled, onClick }: StepProps) {
  const size = useSize()
  const Icon = useIcon(icon)

  return (
    <Button
      variant="ghost"
      size={size.variant === 'compact' ? 'icon-compact' : 'icon'}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
    >
      <Icon />
    </Button>
  )
}

interface PaginationProps {
  /** Number of pages. Below 1 it counts as 1. */
  count: number
  /** Controlled current page, counted from 1. Pair with `onValueChange`. */
  value?: number
  /** Initial page, for an uncontrolled pagination. Defaults to `1`. */
  defaultValue?: number
  /** Called with the new page whenever it changes. */
  onValueChange?: (page: number) => void
  /** Page buttons along a strip, or a field to type the page into (the dense layout data tables use). Defaults to `"pages"`. */
  variant?: PaginationVariant
  /** Pages shown on each side of the current one before a gap, with `variant="pages"`. Defaults to `1`. */
  siblings?: number
  /** Shows the first and last page buttons. Defaults to on with `variant="input"` and off with `variant="pages"`. */
  edges?: boolean
  /** Disables every control, e.g. while a page loads. Defaults to `false`. */
  disabled?: boolean
  /** Accessible name of the `nav`. Defaults to `"Pagination"`. */
  label?: string
  /** Accessible name of the first page button. Defaults to `"First page"`. */
  firstLabel?: string
  /** Accessible name of the previous page button. Defaults to `"Previous page"`. */
  previousLabel?: string
  /** Accessible name of the next page button. Defaults to `"Next page"`. */
  nextLabel?: string
  /** Accessible name of the last page button. Defaults to `"Last page"`. */
  lastLabel?: string
  /** Accessible name of the page field, with `variant="input"`. Defaults to `"Page"`. */
  pageLabel?: string
  /** Pins the strip to one step of the size ladder (36px default, 28px compact). Defaults to the surrounding SizeProvider. */
  size?: SizeVariant
  /** Classes for the `nav` root. */
  className?: string
}

/**
 * Page navigation: first, previous, the pages or a field to jump to one,
 * next and last.
 *
 * With the default `variant="pages"` the strip shows the first and last
 * pages and the current page's neighbours (`siblings`), with a gap wherever
 * pages are skipped. The current page is a liquid indicator: picking another
 * page melts it across the strip (see the liquid indicators in Morph), and
 * its number turns semibold without moving the others. One fluid hover
 * highlight runs along the page buttons, so a click between two pages lands
 * on the lit one. The strip keeps every page at the control's size, so it
 * never wraps: on a narrow screen pass `siblings={0}`, or the field.
 *
 * `variant="input"` swaps the strip for a field showing the current page and
 * the page count (`3 / 12`): type a page and press Enter, or leave the field,
 * to go there; Escape puts the current page back. It brings first and last
 * buttons with it (`edges`). Every label is a prop, so a translated app
 * passes its own strings. Works controlled (`value` + `onValueChange`) or
 * uncontrolled (`defaultValue`); the page is counted from 1.
 *
 * @example {@include ./examples.mdx}
 */
function Pagination({
  count,
  value,
  defaultValue = 1,
  onValueChange,
  variant = 'pages',
  siblings = 1,
  edges: edgesProp,
  disabled = false,
  label = 'Pagination',
  firstLabel = 'First page',
  previousLabel = 'Previous page',
  nextLabel = 'Next page',
  lastLabel = 'Last page',
  pageLabel = 'Page',
  size: sizeProp,
  className,
}: PaginationProps) {
  const [requested, setCurrent] = useControllableState(value, defaultValue, onValueChange)
  const size = useSize(sizeProp)
  const total = Math.max(1, count)
  const current = Math.min(Math.max(1, requested), total)
  const edges = edgesProp ?? variant === 'input'
  const atStart = disabled || current <= 1
  const atEnd = disabled || current >= total

  return (
    <SizeScope size={sizeProp}>
      <nav aria-label={label} className={cn('flex items-center', size.gap, className)}>
        {edges && <Step icon="chevrons-left" label={firstLabel} disabled={atStart} onClick={() => setCurrent(1)} />}
        <Step icon="chevron-left" label={previousLabel} disabled={atStart} onClick={() => setCurrent(current - 1)} />
        {variant === 'input' ? (
          <PageField current={current} total={total} disabled={disabled} label={pageLabel} onSelect={setCurrent} />
        ) : (
          <PageStrip current={current} total={total} siblings={siblings} disabled={disabled} onSelect={setCurrent} />
        )}
        <Step icon="chevron-right" label={nextLabel} disabled={atEnd} onClick={() => setCurrent(current + 1)} />
        {edges && <Step icon="chevrons-right" label={lastLabel} disabled={atEnd} onClick={() => setCurrent(total)} />}
      </nav>
    </SizeScope>
  )
}

export type { PaginationProps, PaginationVariant }
export { Pagination }
export default Pagination
