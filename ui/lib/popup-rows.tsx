/*
 * Local addition (not part of Fluid Functionalism): the row of a popup list
 * (Select, Combobox, Dropdown, ContextMenu, Command), FF's per-component copies
 * of it in one place.
 */

'use client'

import { AnimatePresence, motion } from 'motion/react'
import { Children, forwardRef, type HTMLAttributes, type ReactNode } from 'react'
import type { IconComponent } from './icon-context'
import { useReduceMotion } from './reduced-motion'
import type { ShapeClasses } from './shape-context'
import { type SizeClasses, useSize } from './size-context'
import { spring } from './springs'
import { cn } from './utils'

interface RowClassesOptions {
  size: SizeClasses
  shape: ShapeClasses
  /** Foreground when `true` (hovered, highlighted or checked), muted when `false`. Leave it out to color the label yourself. */
  lit?: boolean
  disabled?: boolean
}

/**
 * Classes for a popup row: a fixed control height (so the trimmed label
 * can't shrink it), `shrink-0` (a max-height flex column would squeeze rows
 * instead of scrolling), the shape's item radius, the ladder's gap, inset
 * and text, above the hover and checked backgrounds.
 */
export function rowClasses({ size, shape, lit, disabled = false }: RowClassesOptions) {
  return cn(
    'relative z-10 flex shrink-0 cursor-pointer select-none items-center outline-none transition-[color] duration-fast',
    size.control,
    size.gap,
    size.itemPx,
    size.text,
    shape.item,
    lit !== undefined && (lit ? 'text-foreground' : 'text-muted-foreground'),
    disabled && 'pointer-events-none opacity-50',
  )
}

/** A row label that fills the row and truncates; the padding keeps the clip off ascenders and descenders. */
export const rowLabelClass = 'min-w-0 flex-1 truncate text-trim py-1 -my-1'

/** Whether a label is plain text (strings and numbers, `{name} (you)` included) rather than a node. */
export function isTextLabel(label: ReactNode) {
  return Children.toArray(label).every(part => typeof part === 'string' || typeof part === 'number')
}

/** A row label's classes: text trims and truncates; a node (an avatar and a name, a badge) keeps its own box, which trimming and clipping would cut. */
export function rowLabelBoxClass(label: ReactNode) {
  return isTextLabel(label) ? rowLabelClass : 'flex min-w-0 flex-1 items-center'
}

/** A row's leading icon: the ladder's icon size, heavier while the row is lit. */
export function RowIcon({ icon: Icon, lit }: { icon: IconComponent; lit: boolean }) {
  const size = useSize()
  return (
    <Icon
      size={size.icon}
      strokeWidth={lit ? 2 : 1.5}
      className="shrink-0 transition-[color,stroke-width] duration-fast"
    />
  )
}

interface CheckMarkProps {
  /** Draws the check; clearing it erases the stroke. */
  checked: boolean
  /** Keeps the check's slot while unchecked, so a pick never changes the row's (and the popup's) width. Defaults to `false`. */
  reserve?: boolean
}

/**
 * The trailing check of a picked row. Its stroke draws in on `spring.fast`
 * and erases on the exit tween (a fade under reduced motion); a row that is
 * already checked when it mounts shows it drawn.
 */
export function CheckMark({ checked, reserve = false }: CheckMarkProps) {
  const size = useSize()
  const reduceMotion = useReduceMotion()
  const draw = { duration: spring.fast.duration, ease: 'easeOut' } as const
  const erase = { ...spring.fast.exit, ease: 'easeIn' } as const

  const check = (
    <AnimatePresence initial={false}>
      {checked && (
        <motion.svg
          key="check"
          aria-hidden
          width={size.icon}
          height={size.icon}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="shrink-0 text-foreground"
          // Holds the svg while the path erases.
          exit={{ opacity: 1 }}
        >
          <motion.path
            d="M4 12L9 17L20 6"
            initial={reduceMotion ? { opacity: 0 } : { pathLength: 0 }}
            animate={{ pathLength: 1, opacity: 1, transition: draw }}
            exit={reduceMotion ? { opacity: 0, transition: erase } : { pathLength: 0, transition: erase }}
          />
        </motion.svg>
      )}
    </AnimatePresence>
  )

  if (!reserve) return check
  return (
    <span aria-hidden className="shrink-0" style={{ width: size.icon, height: size.icon }}>
      {check}
    </span>
  )
}

/** A group heading inside a popup list, in the caption role. */
export const PopupLabel = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => {
  const compact = useSize().variant === 'compact'
  return (
    <div
      ref={ref}
      className={cn(
        'shrink-0 px-2 py-1.5 text-muted-foreground',
        compact ? 'text-caption-compact' : 'text-caption',
        className,
      )}
      {...props}
    />
  )
})
PopupLabel.displayName = 'PopupLabel'

/** A hairline between groups of a popup list, edge to edge. */
export const PopupSeparator = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    // biome-ignore lint/a11y/useSemanticElements: an <hr> brings its own border; the hairline is a fill.
    <div ref={ref} role="separator" className={cn('-mx-1 my-1 h-px shrink-0 bg-border/60', className)} {...props} />
  ),
)
PopupSeparator.displayName = 'PopupSeparator'
