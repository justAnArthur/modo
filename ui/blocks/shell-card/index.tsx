/*
 * Local addition (not part of Fluid Functionalism): a sunken shell
 * (`bg-sunken`, a hairline inside) holding one raised card and a footer row.
 * The inset is `--space-2`; the shell's corner (`rounded-shell|pill-shell`)
 * is the inner card's plus that inset, so the two stay concentric.
 */

'use client'

import type { HTMLAttributes, ReactNode } from 'react'
import { useShape } from '../../lib/shape-context'
import { SURFACE_BG, SURFACE_SHADOW } from '../../lib/surface-classes'
import { SurfaceProvider, useLift } from '../../lib/surface-context'
import { cn } from '../../lib/utils'

interface ShellCardInnerProps extends HTMLAttributes<HTMLDivElement> {
  /** The inner card's content. */
  children?: ReactNode
  /** Classes for the inner card. */
  className?: string
}

/** The raised card inside the shell, one surface level up, with a hairline ring. */
function ShellCardInner({ children, className, ...props }: ShellCardInnerProps) {
  const level = useLift(2)
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

// Literal table: UnoCSS only generates the classes it can read whole.
const SHELL_RADIUS = { rounded: 'rounded-shell', pill: 'rounded-pill-shell' } as const

interface ShellCardProps extends HTMLAttributes<HTMLDivElement> {
  /** The inner card: a `ShellCard.Inner`, or any card-like element of its own (a composer). */
  children?: ReactNode
  /** The row under the inner card: a `ShellCard.Footer`. */
  footer?: ReactNode
  /** A tray set into the page, or a card lifted off it (two surface levels up with a popup's shadow, like the app's other floating cards). Defaults to `'sunken'`. */
  variant?: 'sunken' | 'elevated'
  /** Classes for the shell. */
  className?: string
}

/**
 * A card held in a soft shell: one raised inner card for the content, and
 * a quiet row under it on the shell for what belongs to the card but is
 * not its content (a category and a date, or the controls that set where
 * a message goes).
 *
 * By default the shell is a tray set into the page (`bg-sunken`: greyer
 * in light, darker in dark) with a hairline inside its edge;
 * `variant="elevated"` lifts it off the page instead, two surface levels
 * with a popup's shadow, like other floating cards (a composer, a prompt).
 * The inner card lifts two levels above the shell with its shadow, so the
 * two read as a card resting in its holder in both schemes. The inset is
 * one spacing step (`--space-2`) and the corners nest: the shell's is the
 * inner card's plus that inset, in rounded and pill shapes alike. Any
 * card-like element (an InputMessage) can take `ShellCard.Inner`'s place.
 * For a flat list of cards, see Card.
 *
 * Statics:
 * - `ShellCard.Inner` — the raised inner card (two surface levels up, with its shadow).
 * - `ShellCard.Footer` — the row under it: caption meta spread to both ends, or controls.
 *
 * @example {@include ./examples.mdx}
 */
function ShellCard({ children, footer, variant = 'sunken', className, ...props }: ShellCardProps) {
  const shape = useShape()
  const level = useLift(variant === 'elevated' ? 2 : 0)
  return (
    <SurfaceProvider value={level}>
      <div
        className={cn(
          'flex min-w-0 flex-col p-[var(--space-2)]',
          variant === 'elevated' && SURFACE_BG[level],
          variant === 'elevated' && SURFACE_SHADOW[3],
          variant === 'sunken' && 'bg-sunken ring-1 ring-inset ring-border',
          SHELL_RADIUS[shape.variant],
          className,
        )}
        {...props}
      >
        {children}
        {footer}
      </div>
    </SurfaceProvider>
  )
}

ShellCard.Inner = ShellCardInner
ShellCard.Footer = ShellCardFooter

export type { ShellCardFooterProps, ShellCardInnerProps, ShellCardProps }
export { ShellCard }

export default ShellCard
