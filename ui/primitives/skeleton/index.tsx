/*
 * Local addition (not part of Fluid Functionalism): the loading placeholder.
 * A `--skeleton` fill that pulses in opacity (`skeleton.css`), on the shape
 * slots and, for rows, on the size ladder.
 */

import { type ComponentPropsWithoutRef, forwardRef } from 'react'
import { useReduceMotion } from '../../lib/reduced-motion'
import { useShape } from '../../lib/shape-context'
import { type SizeVariant, useSize } from '../../lib/size-context'
import { cn } from '../../lib/utils'

interface SkeletonProps extends Omit<ComponentPropsWithoutRef<'div'>, 'children'> {
  /** Renders a stack of this many row placeholders, each one control tall, for a list or table still loading. Omitted, the skeleton is one block you size with `className`. */
  rows?: number
  /** Frames the rows in a hairline container, like an outlined Card.Group. Only with `rows`. Defaults to `false`. */
  bordered?: boolean
  /** Pins the rows to one step of the size ladder (36px default, 28px compact). Defaults to the surrounding SizeProvider. */
  size?: SizeVariant
  /** Classes for the block (its width, height and radius) or, with `rows`, for the stack. */
  className?: string
}

/**
 * A placeholder that holds the place of content still loading, so nothing
 * jumps when it arrives.
 *
 * One block by default: give it the size of what it stands for through
 * `className` (`h-4 w-40` for a line of text, `size-9 rounded-full` for an
 * avatar). With `rows` it becomes a stack of rows one control tall, the height
 * of the list or table rows that will replace it, and `bordered` frames them
 * like an outlined group (the row corners nest inside the frame's). The fill is
 * a light mix of the foreground, so it reads on any surface level in light and
 * dark, and every placeholder pulses in step, in opacity only. Under reduced
 * motion it holds still. Placeholders are hidden from assistive tech: mark the
 * region that is loading with `aria-busy`.
 *
 * @example {@include ./examples.mdx}
 */
const Skeleton = forwardRef<HTMLDivElement, SkeletonProps>(
  ({ rows, bordered = false, size: sizeProp, className, ...props }, ref) => {
    const shape = useShape()
    const size = useSize(sizeProp)
    const pulse = !useReduceMotion() && 'skeleton-pulse'

    if (rows === undefined)
      return <div ref={ref} aria-hidden {...props} className={cn('bg-skeleton', shape.item, pulse, className)} />

    return (
      <div
        ref={ref}
        aria-hidden
        {...props}
        className={cn('flex flex-col gap-1', bordered && cn('border border-border p-1', shape.container), className)}
      >
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className={cn('w-full bg-skeleton', size.control, shape.item, pulse)} />
        ))}
      </div>
    )
  },
)

Skeleton.displayName = 'Skeleton'

export type { SkeletonProps }
export { Skeleton }

export default Skeleton
