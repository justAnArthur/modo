/*!
 * Local addition (not part of Fluid Functionalism): a keyboard shortcut, as a
 * keycap chip or as plain muted text beside a menu row's label.
 */

import type { ReactNode } from 'react'
import { cn } from '../../lib/utils'

type KbdVariant = 'plain' | 'outline'

// Literal table: UnoCSS only generates the classes it can read whole.
const VARIANT: Record<KbdVariant, string> = {
  plain: '',
  outline: 'rounded-box border border-border bg-background px-1',
}

interface KbdProps {
  /** The keys, as they read: `⌘K`, `⇧⌘O`, `Esc`. */
  children: ReactNode
  /** A keycap chip with a hairline, or the bare muted text for a row's trailing shortcut. Defaults to `'outline'`. */
  variant?: KbdVariant
  /** Classes for the `kbd`. */
  className?: string
}

/**
 * A keyboard shortcut, shown as a small keycap.
 *
 * The outline chip sits in running text and inputs (a search field's `⌘K`);
 * the plain variant drops the chip and leaves the muted keys, for the trailing
 * shortcut of a menu or Sidebar row. Write the keys as they read; a chord is
 * one Kbd, a sequence is several.
 *
 * @example {@include ./examples.mdx}
 */
function Kbd({ children, variant = 'outline', className }: KbdProps) {
  return (
    <kbd
      className={cn(
        'inline-flex shrink-0 items-center font-sans text-micro text-muted-foreground',
        VARIANT[variant],
        className,
      )}
    >
      {children}
    </kbd>
  )
}

export type { KbdProps }
export { Kbd }

export default Kbd
