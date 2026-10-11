/*
 * Local addition (not part of Fluid Functionalism): the hairline between two
 * groups of content, on Base UI's Separator (role and orientation for
 * assistive tech) and the `border` token.
 */

import { Separator as SeparatorPrimitive } from '@base-ui/react/separator'
import { type ComponentPropsWithoutRef, forwardRef } from 'react'
import { cn } from '../../lib/utils'

const ORIENTATION = {
  horizontal: 'h-px w-full',
  vertical: 'w-px self-stretch',
}

interface SeparatorProps extends Omit<ComponentPropsWithoutRef<'div'>, 'children'> {
  /** Which way the line runs: across a stack, or down between items of a row. A vertical line stretches to its row's height. Defaults to `"horizontal"`. */
  orientation?: 'horizontal' | 'vertical'
  /** Classes for the line: margins, or a length that isn't the full run. */
  className?: string
}

/**
 * A 1px hairline between groups of content: stacked sections, a toolbar's
 * clusters, a card's body and its actions.
 *
 * It is the system's only line: `border`, 12% of the foreground, so it tracks
 * light and dark and any forced scheme on a subtree, and it never thickens or
 * takes a color. Base UI's Separator gives it the `separator` role and its
 * orientation for screen readers. Horizontal lines fill their container's
 * width; vertical ones stretch to the height of the row they sit in. Spacing
 * around it is the layout's: pass margins through `className`. Other props
 * go to the `div`.
 *
 * @example {@include ./examples.mdx}
 */
const Separator = forwardRef<HTMLDivElement, SeparatorProps>(
  ({ orientation = 'horizontal', className, ...props }, ref) => (
    <SeparatorPrimitive
      ref={ref}
      {...props}
      orientation={orientation}
      className={cn('shrink-0 bg-border', ORIENTATION[orientation], className)}
    />
  ),
)

Separator.displayName = 'Separator'

export type { SeparatorProps }
export { Separator }

export default Separator
