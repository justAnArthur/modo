/*
 * Local addition (not part of Fluid Functionalism): a keyboard shortcut, as a
 * keycap chip or as plain muted text beside a menu row's label (the same
 * text as Dropdown's and Command's row shortcuts).
 */

'use client'

import type { ReactNode } from 'react'
import { type SizeVariant, useSize } from '../../../lib/size-context'
import { cn } from '../../../lib/utils'

type KbdVariant = 'plain' | 'outline'

// Literal tables: UnoCSS only generates the classes it can read whole.
const VARIANT: Record<KbdVariant, Record<SizeVariant, string>> = {
  plain: { default: 'text-caption', compact: 'text-caption-compact' },
  outline: {
    default: 'rounded-box border border-border bg-background px-1 text-micro',
    compact: 'rounded-box border border-border bg-background px-1 text-micro-compact',
  },
}

interface KbdProps {
  /** The keys, as they read: `⌘K`, `⇧⌘O`, `Esc`. */
  children: ReactNode
  /** A keycap chip with a hairline, or the bare muted text for a row's trailing shortcut. Defaults to `'outline'`. */
  variant?: KbdVariant
  /** Pins the keys to one step of the size ladder (36px default, 28px compact). Defaults to the surrounding SizeProvider. */
  size?: SizeVariant
  /** Classes for the `kbd`. */
  className?: string
}

/**
 * A keyboard shortcut, shown as a small keycap.
 *
 * The outline chip sits in running text and inputs (a search field's `⌘K`);
 * the plain variant drops the chip and leaves the muted keys, for the trailing
 * shortcut of a menu or Sidebar row, in the same caption text as Dropdown's
 * shortcuts. Both step down in a compact region. Write the keys as they read;
 * a chord is one Kbd, a sequence is several.
 *
 * @example {@include ./examples.mdx}
 */
function Kbd({ children, variant = 'outline', size, className }: KbdProps) {
  const ladder = useSize(size)

  return (
    <kbd
      className={cn(
        'inline-flex shrink-0 items-center font-sans text-muted-foreground',
        VARIANT[variant][ladder.variant],
        className,
      )}
    >
      {children}
    </kbd>
  )
}

export type { KbdProps, KbdVariant }
export { Kbd }

export default Kbd
