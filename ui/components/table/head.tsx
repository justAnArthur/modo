/*!
 * Ported from Fluid Functionalism — github.com/mickadesign/fluid-functionalism
 * `registry/default/table.tsx` @ b3587bdbd83fc66c2a6aae3817ffb856cb09260b
 * MIT License © 2026 Micka Touillaud — fluidfunctionalism.com (notice: LICENSE.fluid-functionalism)
 * Local changes: see PORTING.md.
 */

'use client'

import { motion } from 'motion/react'
import { forwardRef, type ThHTMLAttributes } from 'react'
import { type IconName, useIcon } from '../../lib/icon-context'
import { useReduceMotion } from '../../lib/reduced-motion'
import { useSize } from '../../lib/size-context'
import { spring } from '../../lib/springs'
import { cn } from '../../lib/utils'
import { type SortDirection, useCellPadding, useTable } from './context'

type GlyphState = SortDirection | 'none'

const GLYPHS: [GlyphState, IconName][] = [
  ['none', 'arrow-up-down'],
  ['asc', 'arrow-up'],
  ['desc', 'arrow-down'],
]

const ARIA_SORT = { asc: 'ascending', desc: 'descending', none: 'none' } as const

const SHOWN = { opacity: 1, scale: 1, filter: 'blur(0px)' }
const HIDDEN = { opacity: 0, scale: 0.6, filter: 'blur(4px)' }
const enter = { type: 'tween' as const, duration: spring.fast.duration, ease: 'easeOut' as const }
const leave = { type: 'tween' as const, ...spring.fast.exit, ease: 'easeIn' as const }

function SortGlyph({ glyph, shown, sorted }: { glyph: IconName; shown: boolean; sorted: boolean }) {
  const Icon = useIcon(glyph)
  const reduced = useReduceMotion()
  const size = useSize()
  return (
    <motion.span
      className="col-start-1 row-start-1 flex"
      initial={false}
      animate={shown ? SHOWN : reduced ? { opacity: 0 } : HIDDEN}
      transition={shown ? enter : leave}
    >
      <Icon
        size={size.icon}
        strokeWidth={1.5}
        className={cn('transition-[stroke-width] duration-fast group-hover/sort:stroke-2', sorted && 'stroke-2')}
      />
    </motion.span>
  )
}

interface TableHeadProps extends ThHTMLAttributes<HTMLTableCellElement> {
  /** The column's key in the table's `sort`. Giving one makes the head a sort button. */
  value?: string
}

const TableHead = forwardRef<HTMLTableCellElement, TableHeadProps>(({ value, className, children, ...props }, ref) => {
  const table = useTable()
  const size = useSize()
  const padding = useCellPadding()
  const sortable = value !== undefined && table !== null
  const state: GlyphState = sortable && table.sort?.value === value ? table.sort.direction : 'none'

  return (
    <th
      ref={ref}
      aria-sort={sortable ? ARIA_SORT[state] : undefined}
      className={cn('text-left text-foreground', padding, className)}
      {...props}
    >
      {sortable ? (
        <button
          type="button"
          onClick={() => table.toggleSort(value)}
          className={cn(
            'group/sort -mx-1 inline-flex cursor-pointer items-center rounded-glyph px-1 text-inherit outline-none focus-visible:ring-1 focus-visible:ring-focus-ring',
            size.gap,
          )}
        >
          {children}
          <span
            aria-hidden
            className={cn(
              'grid shrink-0 transition-[color] duration-fast group-hover/sort:text-foreground',
              state === 'none' ? 'text-muted-foreground' : 'text-foreground',
            )}
          >
            {GLYPHS.map(([glyphState, glyph]) => (
              <SortGlyph key={glyph} glyph={glyph} shown={glyphState === state} sorted={state !== 'none'} />
            ))}
          </span>
        </button>
      ) : (
        children
      )}
    </th>
  )
})

TableHead.displayName = 'TableHead'

export type { TableHeadProps }
export { TableHead }
