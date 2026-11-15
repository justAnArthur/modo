/*!
 * Local addition (not part of Fluid Functionalism): a single-choice list
 * whose rows hold any content (a title, a description, meters). Radio's
 * systems on rich rows: one fluid hover highlight, the selected background a
 * GooIndicator that melts between rows, a focus ring that springs between
 * rows for keyboard focus only, and arrow keys that move the pick. A row's
 * optional actions sit beside its button and show on hover or focus.
 */

'use client'

import { AnimatePresence, motion } from 'motion/react'
import { forwardRef, type KeyboardEvent, type MutableRefObject, type ReactNode, useRef, useState } from 'react'
import { FluidHoverHighlight } from '../../../lib/fluid-hover-highlight'
import { GooIndicator } from '../../../lib/goo-indicator'
import { useShape } from '../../../lib/shape-context'
import { type SizeVariant, useSize } from '../../../lib/size-context'
import { spring } from '../../../lib/springs'
import { useControllableState } from '../../../lib/use-controllable-state'
import { useFluidHover, useRegisterFluidHoverItem } from '../../../lib/use-fluid-hover'
import { cn } from '../../../lib/utils'
import { SizeProvider } from '../../../primitives/sizes'

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
  /** Controls at the row's right end, shown while it is hovered or holds focus (always on touch). They sit beside the row's button, not in it, so a press on them never picks the row. */
  actions?: ReactNode
}

interface RowProps {
  option: ChoiceOption
  index: number
  selected: boolean
  tabbable: boolean
  register: (index: number, element: HTMLElement | null) => void
  onPick: (value: string) => void
  onFocusRow: (index: number | null) => void
  rowClassName?: string
}

function Row({ option, index, selected, tabbable, register, onPick, onFocusRow, rowClassName }: RowProps) {
  const ref = useRef<HTMLButtonElement | null>(null)
  const shape = useShape()
  const size = useSize()
  useRegisterFluidHoverItem(register, index, ref)

  const row = (
    // biome-ignore lint/a11y/useSemanticElements: a radio row holds rich content (meters, two lines), so it is a button with radio semantics
    <button
      ref={ref}
      type="button"
      role="radio"
      aria-checked={selected}
      aria-label={option.label}
      disabled={option.disabled}
      tabIndex={tabbable ? 0 : -1}
      data-choice-row=""
      onClick={() => onPick(option.value)}
      onFocus={e => onFocusRow(e.currentTarget.matches(':focus-visible') ? index : null)}
      onBlur={() => onFocusRow(null)}
      className={cn(
        'relative z-10 flex w-full cursor-pointer items-start gap-2 text-left text-foreground outline-none transition-[opacity] duration-fast disabled:pointer-events-none disabled:opacity-50',
        size.itemPx,
        ROW_PY[size.variant],
        size.text,
        shape.item,
        rowClassName,
      )}
    >
      {option.content}
    </button>
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
  /** Pins the rows to one step of the size ladder (36px default, 28px compact). Defaults to the surrounding SizeProvider. */
  size?: SizeVariant
  /** Classes for the `radiogroup` root. */
  className?: string
  /** Classes for every row's button, such as a fixed height for one-line rows. */
  rowClassName?: string
}

/**
 * A single choice over rows that hold anything: a name and a note, a profile
 * and its usage meters, a file and its change count.
 *
 * It works like Radio, on rows of any shape. One hover highlight glides
 * between rows, the picked row's background melts to the next pick, and by
 * keyboard a ring springs from row to row while the arrow keys, Home and End
 * move the pick. Disabled rows are skipped. A row's `actions` sit at its
 * right end, shown on hover or focus, and a press on them never picks the
 * row. Works controlled (`value` + `onValueChange`) or uncontrolled
 * (`defaultValue`).
 *
 * @example {@include ./examples.mdx}
 */
const ChoiceList = forwardRef<HTMLDivElement, ChoiceListProps>(
  ({ options, value, defaultValue, onValueChange, label, size: sizeProp, className, rowClassName }, ref) => {
    const [current, setCurrent] = useControllableState(value, defaultValue ?? options[0]?.value ?? '', onValueChange)
    const shape = useShape()
    const containerRef = useRef<HTMLDivElement | null>(null)
    const hover = useFluidHover(containerRef, { isItemDisabled: el => (el as HTMLButtonElement).disabled })
    const [focused, setFocused] = useState<number | null>(null)
    const selectedIndex = options.findIndex(o => o.value === current)
    const selectedRect = hover.isMeasured ? hover.itemRects[selectedIndex] : undefined
    const focusRect = focused === null ? undefined : hover.itemRects[focused]

    const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
      if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) return
      const rows = Array.from(
        containerRef.current?.querySelectorAll<HTMLButtonElement>('[data-choice-row]:not(:disabled)') ?? [],
      )
      const at = rows.indexOf(e.target as HTMLButtonElement)
      if (at === -1) return
      e.preventDefault()
      const next =
        e.key === 'Home'
          ? 0
          : e.key === 'End'
            ? rows.length - 1
            : (at + (e.key === 'ArrowDown' ? 1 : -1) + rows.length) % rows.length
      rows[next]?.focus()
      rows[next]?.click()
    }

    const list = (
      <div
        ref={node => {
          containerRef.current = node
          if (typeof ref === 'function') ref(node)
          else if (ref) (ref as MutableRefObject<HTMLDivElement | null>).current = node
        }}
        role="radiogroup"
        aria-label={label}
        {...hover.handlers}
        onKeyDown={onKeyDown}
        className={cn('relative flex flex-col', className)}
      >
        {selectedRect && <GooIndicator rect={selectedRect} className={cn('bg-active', shape.bg)} />}
        <FluidHoverHighlight hover={hover} className={shape.bg} />
        <AnimatePresence>
          {focusRect && (
            <motion.div
              className={cn('pointer-events-none absolute z-20 border border-focus-ring', shape.focusRing)}
              initial={false}
              animate={{
                left: focusRect.left - 2,
                top: focusRect.top - 2,
                width: focusRect.width + 4,
                height: focusRect.height + 4,
              }}
              exit={{ opacity: 0, transition: spring.fast.exit }}
              transition={spring.fast}
            />
          )}
        </AnimatePresence>
        {options.map((option, i) => (
          <Row
            key={option.value}
            option={option}
            index={i}
            selected={option.value === current}
            tabbable={selectedIndex === -1 ? i === 0 : i === selectedIndex}
            register={hover.registerItem}
            onPick={setCurrent}
            onFocusRow={setFocused}
            rowClassName={rowClassName}
          />
        ))}
      </div>
    )

    // A size prop pins the rows and anything their content sizes from the ladder.
    return sizeProp ? <SizeProvider size={sizeProp}>{list}</SizeProvider> : list
  },
)

export type { ChoiceListProps, ChoiceOption }
export { ChoiceList }

export default ChoiceList
