/*
 * Local addition (not part of Fluid Functionalism): FF's ghost-span label, a
 * label that changes weight without changing width.
 */

import { forwardRef, type HTMLAttributes, type ReactNode } from 'react'
import { cn } from './utils'

interface WeightLabelProps extends HTMLAttributes<HTMLSpanElement> {
  /** The label. */
  children: ReactNode
  /** Shows the heavy weight (selected, checked, open). */
  emphasized: boolean
  /** Foreground when `true`, muted when `false`. Leave it out to inherit the color. */
  lit?: boolean
  /** The heavy weight, which the hidden copy reserves. Defaults to `'semibold'`. */
  weight?: 'medium' | 'semibold'
  /** Trims the text box to cap height and baseline, for a label in a fixed-height row. Defaults to `false`. */
  trim?: boolean
  /** Ends a long label in an ellipsis: `'line'` keeps it on one line, `'inherit'` only once an inherited `white-space: nowrap` (a consumer's `truncate`) does, wrapping otherwise. Leave it out to wrap. */
  truncate?: 'line' | 'inherit'
  /** Classes for the wrapper: the text role, `flex-1`, alignment. */
  className?: string
}

const HEAVY = { medium: 'weight-medium', semibold: 'weight-semibold' } as const

/**
 * A label that animates between `weight-normal` and a heavier weight
 * without reflowing its row: an invisible copy at the heavy weight sits in
 * the same grid cell and holds the width, hidden from assistive tech.
 */
export const WeightLabel = forwardRef<HTMLSpanElement, WeightLabelProps>(
  ({ children, emphasized, lit, weight = 'semibold', trim = false, truncate, className, ...props }, ref) => {
    // A trimmed box clips ascenders and descenders under `truncate`'s overflow;
    // the padding grows the clip box and the margins take it back out.
    const cell = cn(
      'col-start-1 row-start-1',
      trim && 'text-trim',
      truncate && 'min-w-0 overflow-hidden text-ellipsis',
      truncate === 'line' && 'whitespace-nowrap',
      trim && truncate && 'py-[0.25em] -my-[0.25em]',
    )

    return (
      <span
        ref={ref}
        className={cn('inline-grid', truncate && 'min-w-0 grid-cols-[minmax(0,1fr)]', className)}
        {...props}
      >
        <span aria-hidden className={cn(cell, 'invisible', HEAVY[weight])}>
          {children}
        </span>
        <span
          className={cn(
            cell,
            'transition-[color,font-variation-settings] duration-fast',
            lit !== undefined && (lit ? 'text-foreground' : 'text-muted-foreground'),
            emphasized ? HEAVY[weight] : 'weight-normal',
          )}
        >
          {children}
        </span>
      </span>
    )
  },
)

WeightLabel.displayName = 'WeightLabel'
