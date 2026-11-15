/*!
 * Local addition (not part of Fluid Functionalism): a card variant with an
 * inner card — a sunken outer shell (`--sunken`, a hairline inside) holding
 * one raised card and a footer row under it. The inset and the footer's
 * padding are `--space-2`; the shell's corner is `--radius-shell`, the inner
 * container's corner plus that inset, so the two stay concentric.
 */

'use client'

import type { HTMLAttributes, ReactNode } from 'react'
import { useShape } from '../../lib/shape-context'
import { SURFACE_BG, SURFACE_SHADOW } from '../../lib/surface-classes'
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
  const level = Math.min(useSurface() + 2, 8)
  const shape = useShape()
  return (
    <SurfaceProvider value={level}>
      <div
        className={cn('flex min-w-0 flex-col', shape.container, SURFACE_BG[level], SURFACE_SHADOW[2], className)}
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
        'flex min-w-0 items-center justify-between gap-[var(--space-2)] px-[var(--space-2)] pb-0 pt-[var(--space-2)] text-caption text-muted-foreground',
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
 * The shell is a tray set into the page (greyer in light, darker in dark)
 * with a hairline inside its edge; the inner card lifts two surface levels
 * with its shadow, so the two read as a card resting in its holder in both
 * schemes. The inset is one spacing step (`--space-2`) and the corners
 * nest: the shell's is the inner card's plus that inset, in rounded and
 * pill shapes alike. Put any
 * card-like element in the shell in place of `ShellCard.Inner`, such as an
 * InputMessage, and it takes the inner card's place. For a flat list of
 * cards, see Card.
 *
 * Statics:
 * - `ShellCard.Inner` — the raised inner card (two surface levels up, with its shadow).
 * - `ShellCard.Footer` — the row under it: caption meta spread to both ends, or controls.
 *
 * @example {@include ./examples.mdx}
 */
// Literal table: UnoCSS only generates the classes it can read whole.
const SHELL_RADIUS = { rounded: 'rounded-[var(--radius-shell)]', pill: 'rounded-[var(--radius-shell-pill)]' }

function ShellCard({ children, footer, className, ...props }: ShellCardProps) {
  const shape = useShape()
  return (
    <div
      className={cn(
        'flex min-w-0 flex-col bg-sunken p-[var(--space-2)] ring-1 ring-inset ring-border',
        SHELL_RADIUS[shape.variant],
        className,
      )}
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
