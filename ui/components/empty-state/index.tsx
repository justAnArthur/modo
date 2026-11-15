/*!
 * Local addition (not part of Fluid Functionalism): the placeholder a pane or
 * a page shows when it has nothing to list, on the size ladder.
 */

'use client'

import type { ReactNode } from 'react'
import type { IconComponent } from '../../lib/icon-context'
import { useShape } from '../../lib/shape-context'
import { type SizeVariant, useSize } from '../../lib/size-context'
import { cn } from '../../lib/utils'
import { SizeProvider } from '../../primitives/sizes'

// Literal tables: UnoCSS only generates the classes it can read whole.
const FRAME: Record<SizeVariant, string> = {
  default: 'gap-[var(--space-3)] p-[var(--space-6)]',
  compact: 'gap-[var(--space-2)] p-[var(--space-4)]',
}

const TILE: Record<SizeVariant, string> = {
  default: 'size-12 mb-[var(--space-1)]',
  compact: 'size-9',
}

const TITLE: Record<SizeVariant, string> = {
  default: 'text-title',
  compact: 'text-body',
}

const DESCRIPTION: Record<SizeVariant, string> = {
  default: 'text-body',
  compact: 'text-caption',
}

interface EmptyStateProps {
  /** A glyph over the title, in a muted tile. */
  icon?: IconComponent
  /** What is empty, in a few words. */
  title: ReactNode
  /** What it means or what to do next. */
  description?: ReactNode
  /** Buttons under the text, such as the action that fills it. */
  actions?: ReactNode
  /** `'compact'` for a pane or a popover, `'default'` for a page. Defaults to the surrounding SizeProvider. */
  size?: SizeVariant
  /** Classes for the root. */
  className?: string
}

/**
 * What a pane or a page shows when there is nothing in it yet: no sessions,
 * no changes, no results.
 *
 * An icon in a muted tile, a title, a line on what to do, and the actions
 * that do it, centered in whatever holds it. The default size suits a page;
 * `compact` tightens the spacing and steps the text down for a sidebar pane
 * or a popover, and the actions follow it down the size ladder.
 *
 * @example {@include ./examples.mdx}
 */
function EmptyState({ icon: Icon, title, description, actions, size: sizeProp, className }: EmptyStateProps) {
  const size = useSize(sizeProp)
  const step = size.variant
  const shape = useShape()

  return (
    <div className={cn('flex flex-col items-center justify-center text-center', FRAME[step], className)}>
      {Icon && (
        <div
          className={cn(
            'flex items-center justify-center bg-muted text-muted-foreground ring-1 ring-border',
            shape.container,
            TILE[step],
          )}
        >
          <Icon size={step === 'compact' ? 18 : 24} strokeWidth={1.5} />
        </div>
      )}
      <div className="flex max-w-sm flex-col items-center gap-[var(--space-1)]">
        <p className={cn('text-balance weight-semibold text-foreground', TITLE[step])}>{title}</p>
        {description && <p className={cn('text-pretty text-muted-foreground', DESCRIPTION[step])}>{description}</p>}
      </div>
      {actions && (
        <SizeProvider size={step}>
          <div className={cn('mt-[var(--space-1)] flex flex-wrap items-center justify-center', size.gap)}>
            {actions}
          </div>
        </SizeProvider>
      )}
    </div>
  )
}

export type { EmptyStateProps }
export { EmptyState }

export default EmptyState
