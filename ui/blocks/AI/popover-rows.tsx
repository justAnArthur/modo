/*!
 * Local addition: one layout for the AI app's settings popovers
 * (project, profile, run settings), so they read alike: a caption per
 * section and rows on one rhythm — the label on the left in body text, its
 * control on the right, no frames around either. Spacing reads --space-*.
 */

import type { ReactNode } from 'react'
import { cn } from '../../lib/utils'

/** A titled group of rows. `aside` sits on the caption's right (a current value). */
export function PopoverSection({ title, aside, children }: { title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <section aria-label={title} className="flex flex-col gap-[var(--space-1)]">
      <div className="flex items-baseline justify-between gap-[var(--space-2)] pl-[var(--space-2)] pr-[var(--space-3)] text-caption text-muted-foreground">
        <span>{title}</span>
        {aside && <span className="text-foreground">{aside}</span>}
      </div>
      {children}
    </section>
  )
}

/** One setting: its label on the left, its control on the right, one control height. */
export function PopoverRow({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'flex h-9 items-center justify-between gap-[var(--space-2)] pl-[var(--space-2)] text-body',
        className,
      )}
    >
      <span className="min-w-0 truncate text-foreground">{label}</span>
      <div className="flex shrink-0 items-center gap-[var(--space-1)]">{children}</div>
    </div>
  )
}

/** The popovers' shared frame classes for `Popover.Content`. */
export const POPOVER_FRAME = 'w-80 gap-[var(--space-3)] p-[var(--space-2)] pt-[var(--space-3)]'
