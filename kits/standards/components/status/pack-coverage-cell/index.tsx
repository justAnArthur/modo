/*!
 * Local addition: one business × one pack on the overview: the pack's
 * coverage and its fail count, or a dashed "not adopted".
 */

'use client'

import StatusDot from '@justanarthur/modo-ui/components/feedback/status-dot'
import { useShape } from '@justanarthur/modo-ui/lib/shape-context'
import { cn } from '@justanarthur/modo-ui/lib/utils'
import type { MouseEventHandler } from 'react'
import CoverageMeter from '../coverage-meter'

interface PackCoverageCellProps {
  /** Whether the business adopted the pack. Defaults to `true`. */
  adopted?: boolean
  /** The pack's passing share across the business's assets, from 0 to 1, or `null` with nothing counted. */
  value?: number | null
  /** Failing cells nobody is on yet. Defaults to `0`. */
  fails?: number
  /** Cells of the pack being checked right now: a spinner shows, and the figures stay the last results until theirs land. Defaults to `0`. */
  checking?: number
  /** The version the business stays on, when it pins an older one than the pack's latest: shown as `v1`. */
  pinned?: number
  /** The accessible name: the business and the pack, such as `Camasys, Website`. */
  label: string
  /** Called on a press: open the business on this pack. A cell without it is plain text. */
  onClick?: MouseEventHandler<HTMLButtonElement>
  /** Classes for the root. */
  className?: string
}

/**
 * One business against one pack: the share of its cells that pass, a bar of
 * it, and how many fail with nobody on them (`×2`, in the error hue).
 *
 * A pack the business hasn't adopted is a dashed "not adopted" box: a choice,
 * not a failure, so it is never red. A business that stays on an older
 * version of the pack (`website@1`) marks it `v1`. With `onClick` the cell is a
 * button that opens the business there. While some of its cells are being
 * checked a small spinner trails the figures, which hold their last results
 * until the new ones land.
 *
 * @example {@include ./examples.mdx}
 */
export default function PackCoverageCell({
  adopted = true,
  value = null,
  fails = 0,
  checking = 0,
  pinned,
  label,
  onClick,
  className,
}: PackCoverageCellProps) {
  const shape = useShape()

  if (!adopted)
    return (
      <span
        className={cn(
          'inline-flex h-6 items-center border border-dashed border-border px-2 text-caption text-muted-foreground',
          shape.item,
          className,
        )}
      >
        not adopted
      </span>
    )

  const content = (
    <>
      <CoverageMeter value={value} label={`${label} coverage`} />
      <span className="w-6 shrink-0 text-left text-caption tabular-nums text-destructive">
        {fails > 0 && `×${fails}`}
      </span>
      {pinned !== undefined && <span className="text-caption text-muted-foreground">v{pinned}</span>}
      {checking > 0 && <StatusDot status="running" size="compact" className="text-muted-foreground" />}
    </>
  )

  if (!onClick) return <span className={cn('inline-flex items-center gap-1 text-body', className)}>{content}</span>

  return (
    <button
      type="button"
      aria-label={`${label}: ${value === null ? 'nothing counted' : `${Math.round(value * 100)}%`}${fails ? `, ${fails} failing` : ''}${checking ? `, ${checking} being checked` : ''}`}
      onClick={onClick}
      className={cn(
        'inline-flex h-7 cursor-pointer items-center gap-1 px-1.5 text-body outline-none transition-[box-shadow] duration-fast hover:ring-1 hover:ring-border focus-visible:ring-1 focus-visible:ring-focus-ring',
        shape.item,
        className,
      )}
    >
      {content}
    </button>
  )
}

export type { PackCoverageCellProps }
export { PackCoverageCell }
