/*
 * Local addition (not part of Fluid Functionalism): a single-choice list
 * whose rows hold any content (a title, a description, meters). Radio.Group's
 * systems on rich rows: one fluid hover highlight, the selected background a
 * GooIndicator that melts between rows, and `useRowGroup`'s keyboard ring and
 * arrow keys. A row's optional actions sit beside it and show on hover or
 * focus.
 */

'use client'

import { forwardRef, type ReactNode, useRef } from 'react'
import { FluidHoverHighlight } from '../../../lib/fluid-hover-highlight'
import { FocusRing } from '../../../lib/focus-ring'
import { GooIndicator } from '../../../lib/goo-indicator'
import { mergeRefs } from '../../../lib/merge-refs'
import { focusRowOnPress, useRowGroup } from '../../../lib/row-group'
import { useShape } from '../../../lib/shape-context'
import { type SizeVariant, useSize } from '../../../lib/size-context'
import { useControllableState } from '../../../lib/use-controllable-state'
import { useFluidHover, useRegisterFluidHoverItem } from '../../../lib/use-fluid-hover'
import { cn } from '../../../lib/utils'
import { SizeScope } from '../../../primitives/systems/sizes'

// Literal table: UnoCSS only generates the classes it can read whole.
const ROW_PY: Record<SizeVariant, string> = { default: 'py-2', compact: 'py-1.5' }

interface ChoiceOption {
  /** What `onValueChange` reports when the row is picked. */
  value: string
  /** The row's content: text, two lines, a meter. */
  content: ReactNode
  /** The accessible name when `content` is more than text. */
  label?: string
  /** Dims the row and skips it for pointer and arrow keys. */
  disabled?: boolean
  /** Controls at the row's right end, shown while it is hovered or holds focus (always on touch). They sit beside the row, not in it, so a press on them never picks the row. */
  actions?: ReactNode
}

interface RowProps {
  option: ChoiceOption
  index: number
  selected: boolean
  tabbable: boolean
  register: (index: number, element: HTMLElement | null) => void
  onPick: (value: string) => void
  rowClassName?: string
}

function Row({ option, index, selected, tabbable, register, onPick, rowClassName }: RowProps) {
  const ref = useRef<HTMLDivElement | null>(null)
  const shape = useShape()
  const size = useSize()
  useRegisterFluidHoverItem(register, index, ref)

  const pick = () => {
    if (!option.disabled) onPick(option.value)
  }

  const row = (
    // biome-ignore lint/a11y/useSemanticElements: a radio row holds rich content (meters, two lines), so it is a focusable row with radio semantics, like Radio's
    <div
      ref={ref}
      role="radio"
      aria-checked={selected}
      aria-label={option.label}
      aria-disabled={option.disabled || undefined}
      tabIndex={option.disabled ? -1 : tabbable ? 0 : -1}
      data-fluid-hover-index={index}
      onClick={pick}
      onMouseDown={focusRowOnPress}
      onKeyDown={e => {
        if (e.key !== ' ' && e.key !== 'Enter') return
        e.preventDefault()
        pick()
      }}
      className={cn(
        'relative z-10 flex w-full cursor-pointer items-start gap-2 text-left text-foreground outline-none transition-[opacity] duration-fast',
        option.disabled && 'pointer-events-none opacity-50',
        size.itemPx,
        ROW_PY[size.variant],
        size.text,
        shape.item,
        rowClassName,
      )}
    >
      {option.content}
    </div>
  )
  if (!option.actions) return row

  return (
    <div className="group/choice relative">
      {row}
      <div className="absolute inset-y-0 right-1 z-20 flex items-center gap-0.5 opacity-0 transition-[opacity] duration-fast focus-within:opacity-100 group-hover/choice:opacity-100 pointer-coarse:opacity-100">
        {option.actions}
      </div>
    </div>
  )
}

interface ChoiceListProps {
  /** The rows, in order. */
  options: ChoiceOption[]
  /** Controlled picked value. Pair with `onValueChange`. */
  value?: string
  /** Initial picked value, for an uncontrolled list. Defaults to the first option's value. */
  defaultValue?: string
  /** Called with the new value whenever the pick changes. */
  onValueChange?: (value: string) => void
  /** The accessible name of the group. */
  label: string
  /** Submits the picked value under this name in a form. */
  name?: string
  /** Pins the rows to one step of the size ladder (36px default, 28px compact). Defaults to the surrounding SizeProvider. */
  size?: SizeVariant
  /** Classes for the `radiogroup` root. */
  className?: string
  /** Classes for every row, such as a fixed height for one-line rows. */
  rowClassName?: string
}

/**
 * A single choice over rows that hold anything: a name and a note, a profile
 * and its usage meters, a file and its change count.
 *
 * It works like Radio, on rows of any shape and without the circle. One
 * hover highlight glides between rows, the picked row's background melts to
 * the next pick, and by keyboard a ring springs from row to row while the
 * arrow keys, Home and End move the pick. Disabled rows are skipped. A row's
 * `actions` sit at its right end, shown on hover or focus, and a press on
 * them never picks the row. Works controlled (`value` + `onValueChange`) or
 * uncontrolled (`defaultValue`); `name` submits the pick in a form.
 *
 * @example {@include ./examples.mdx}
 */
const ChoiceList = forwardRef<HTMLDivElement, ChoiceListProps>(
  ({ options, value, defaultValue, onValueChange, label, name, size, className, rowClassName }, ref) => {
    const [current, setCurrent] = useControllableState(value, defaultValue ?? options[0]?.value ?? '', onValueChange)
    const shape = useShape()
    const containerRef = useRef<HTMLDivElement | null>(null)
    const hover = useFluidHover(containerRef, { isItemDisabled: el => el.getAttribute('aria-disabled') === 'true' })
    const rowGroup = useRowGroup(hover, { activateOnFocus: true })
    const selectedIndex = options.findIndex(o => o.value === current)
    const selectedRect = hover.isMeasured ? hover.itemRects[selectedIndex] : undefined
    const firstEnabled = options.findIndex(o => !o.disabled)

    return (
      <SizeScope size={size}>
        <div
          ref={mergeRefs(containerRef, ref)}
          role="radiogroup"
          aria-label={label}
          {...hover.handlers}
          {...rowGroup.handlers}
          className={cn('relative flex select-none flex-col', className)}
        >
          {selectedRect && <GooIndicator rect={selectedRect} className={cn('bg-active', shape.bg)} />}
          <FluidHoverHighlight hover={hover} className={shape.bg} />
          <FocusRing rect={rowGroup.focusRect} />
          {options.map((option, i) => (
            <Row
              key={option.value}
              option={option}
              index={i}
              selected={option.value === current}
              tabbable={selectedIndex === -1 ? i === firstEnabled : i === selectedIndex}
              register={hover.registerItem}
              onPick={setCurrent}
              rowClassName={rowClassName}
            />
          ))}
          {name && <input type="hidden" name={name} value={current} />}
        </div>
      </SizeScope>
    )
  },
)

ChoiceList.displayName = 'ChoiceList'

export type { ChoiceListProps, ChoiceOption }
export { ChoiceList }

export default ChoiceList
