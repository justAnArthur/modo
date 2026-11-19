/*!
 * Local addition: a coverage share as a percent beside a short bar, the
 * figure every grid row and pack cell carries.
 */

'use client'

import Meter from '@justanarthur/modo-ui/components/feedback/meter'
import { cn } from '@justanarthur/modo-ui/lib/utils'

interface CoverageMeterProps {
  /** The passing share, from 0 to 1, or `null` when nothing is counted yet (it shows a dash). */
  value: number | null
  /** What is measured, read by screen readers. Defaults to `'Coverage'`. */
  label?: string
  /** The share below which the bar turns to the error hue. Defaults to `0.5`. */
  lowAt?: number
  /** Classes for the root. */
  className?: string
}

/**
 * A coverage figure: the percent of a business's cells that pass, beside a
 * short bar of it.
 *
 * The bar is Meter's bare line (see Meter), ink at rest and in the error hue
 * below `lowAt`, so a business that is mostly failing stands out in a long
 * column; the percent keeps tabular digits and a fixed width, so a column of
 * them lines up. Nothing counted yet (every cell waived, or nothing checked)
 * shows a dash on an empty track.
 *
 * @example {@include ./examples.mdx}
 */
export default function CoverageMeter({ value, label = 'Coverage', lowAt = 0.5, className }: CoverageMeterProps) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <Meter
        variant="line"
        label={label}
        value={value ?? 0}
        tone={value !== null && value < lowAt ? 'error' : 'default'}
        className="w-8 shrink-0"
      />
      <span className="w-9 shrink-0 text-right tabular-nums text-foreground">
        {value === null ? '—' : `${Math.round(value * 100)}%`}
      </span>
    </span>
  )
}

export type { CoverageMeterProps }
export { CoverageMeter }
