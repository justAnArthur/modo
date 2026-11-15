/*!
 * Local addition (not part of Fluid Functionalism): a card variant with an
 * inner card — a soft outer shell (muted, a hairline inside) holding one
 * raised card and a footer row of meta or controls under it. Corners are
 * concentric: the shell's 16px less its 4px inset is the inner card's 12px.
 */

'use client'

import type { HTMLAttributes, ReactNode } from 'react'
import { SURFACE_BG } from '../../lib/surface-classes'
import { SurfaceProvider, useSurface } from '../../lib/surface-context'
import { cn } from '../../lib/utils'

interface ShellCardInnerProps extends HTMLAttributes<HTMLDivElement> {
  /** The inner card's content. */
  children?: ReactNode
  /** Classes for the inner card. */
  className?: string
}

/** The raised card inside the shell, one surface level up, with a hairline ring. */
function ShellCardInner({ children, className, ...props }: ShellCardInnerProps) {
  const level = Math.min(useSurface() + 1, 8)
  return (
    <SurfaceProvider value={level}>
      <div
        className={cn('flex min-w-0 flex-col rounded-xl ring-1 ring-border', SURFACE_BG[level], className)}
        {...props}
      >
        {children}
      </div>
    </SurfaceProvider>
  )
}

interface ShellCardFooterProps extends HTMLAttributes<HTMLDivElement> {
  /** Meta (a category, a date) or controls. */
  children?: ReactNode
  /** Classes for the row. */
  className?: string
}

/** The row under the inner card, on the shell: caption meta spread to both ends. */
function ShellCardFooter({ children, className, ...props }: ShellCardFooterProps) {
  return (
    <div
      className={cn(
        'flex min-w-0 items-center justify-between gap-2 px-3 pb-1.5 pt-2 text-caption text-muted-foreground',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}

interface ShellCardProps extends HTMLAttributes<HTMLDivElement> {
  /** The inner card: a `ShellCard.Inner`, or any card-like element of its own (a composer). */
  children?: ReactNode
  /** The row under the inner card: a `ShellCard.Footer`. */
  footer?: ReactNode
  /** Classes for the shell. */
  className?: string
}

/**
 * A card held in a soft shell: one raised inner card for the content, and
 * a quiet row under it on the shell for what belongs to the card but is
 * not its content (a category and a date, or the controls that set where
 * a message goes).
 *
 * The shell is a muted tray with a hairline inside its edge; the inner card
 * lifts one surface level above it with its own hairline, so the two read
 * as a card resting in its holder in light and dark alike. Corners nest:
 * the shell's 16px less its 4px inset is the inner card's 12px. Put any
 * card-like element in the shell in place of `ShellCard.Inner`, such as an
 * InputMessage, and it takes the inner card's place. For a flat list of
 * cards, see Card.
 *
 * Statics:
 * - `ShellCard.Inner` — the raised inner card (one surface level up).
 * - `ShellCard.Footer` — the row under it: caption meta spread to both ends, or controls.
 *
 * @example {@include ./examples.mdx}
 */
function ShellCard({ children, footer, className, ...props }: ShellCardProps) {
  return (
    <div
      className={cn('flex min-w-0 flex-col rounded-2xl bg-muted p-1 ring-1 ring-inset ring-border', className)}
      {...props}
    >
      {children}
      {footer}
    </div>
  )
}

ShellCard.Inner = ShellCardInner
ShellCard.Footer = ShellCardFooter

export type { ShellCardFooterProps, ShellCardInnerProps, ShellCardProps }
export { ShellCard }

export default ShellCard
