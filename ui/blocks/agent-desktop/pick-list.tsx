/*!
 * Local addition: a single-choice list whose rows hold any content (a title,
 * a description, meters), for the agent desktop's profile switcher, question
 * options and chapter list. Radio's systems on rich rows: one fluid hover
 * highlight, the selected background a GooIndicator that melts between rows,
 * a focus ring that springs between rows for keyboard focus only, and arrow
 * keys that move the pick.
 */

'use client'

import { AnimatePresence, motion } from 'motion/react'
import { type KeyboardEvent, type ReactNode, useRef, useState } from 'react'
import { FluidHoverHighlight } from '../../lib/fluid-hover-highlight'
import { GooIndicator } from '../../lib/goo-indicator'
import { useShape } from '../../lib/shape-context'
import { spring } from '../../lib/springs'
import { useControllableState } from '../../lib/use-controllable-state'
import { useFluidHover, useRegisterFluidHoverItem } from '../../lib/use-fluid-hover'
import { cn } from '../../lib/utils'

export interface PickOption {
  value: string
  content: ReactNode
  /** The accessible name when `content` is more than text. */
  label?: string
  disabled?: boolean
}

interface RowProps {
  option: PickOption
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
  useRegisterFluidHoverItem(register, index, ref)

  return (
    // biome-ignore lint/a11y/useSemanticElements: a radio row holds rich content (meters, two lines), so it is a button with radio semantics
    <button
      ref={ref}
      type="button"
      role="radio"
      aria-checked={selected}
      aria-label={option.label}
      disabled={option.disabled}
      tabIndex={tabbable ? 0 : -1}
      data-pick-row=""
      onClick={() => onPick(option.value)}
      onFocus={e => onFocusRow(e.currentTarget.matches(':focus-visible') ? index : null)}
      onBlur={() => onFocusRow(null)}
      className={cn(
        'relative z-10 flex w-full cursor-pointer items-start gap-2 px-2 py-2 text-left outline-none transition-[opacity] duration-fast disabled:pointer-events-none disabled:opacity-50',
        shape.item,
        rowClassName,
      )}
    >
      {option.content}
    </button>
  )
}

export interface PickListProps {
  options: PickOption[]
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  /** The accessible name of the group. */
  label: string
  className?: string
  rowClassName?: string
}

export function PickList({
  options,
  value,
  defaultValue,
  onValueChange,
  label,
  className,
  rowClassName,
}: PickListProps) {
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
      containerRef.current?.querySelectorAll<HTMLButtonElement>('[data-pick-row]:not(:disabled)') ?? [],
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

  return (
    <div
      ref={containerRef}
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
}
