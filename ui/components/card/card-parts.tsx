/*!
 * Ported from Fluid Functionalism — github.com/mickadesign/fluid-functionalism
 * `registry/default/card.tsx` @ b3587bdbd83fc66c2a6aae3817ffb856cb09260b
 * MIT License © 2026 Micka Touillaud — fluidfunctionalism.com (notice: LICENSE.fluid-functionalism)
 * Local changes: see PORTING.md.
 */

'use client'

import { forwardRef, type HTMLAttributes, useContext } from 'react'
import { useSize } from '../../lib/size-context'
import { cn } from '../../lib/utils'
import { WeightLabel } from '../../lib/weight-label'
import { CardContext } from './card-group'

const CardHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => {
  const { orientation, hasImage } = useContext(CardContext)
  const compact = useSize().variant === 'compact'
  return (
    <div
      ref={ref}
      data-slot="card-header"
      className={cn(
        'grid auto-rows-min items-start gap-1 has-data-[slot=card-action]:grid-cols-[1fr_auto]',
        orientation === 'inline' && hasImage
          ? 'min-w-0'
          : orientation === 'inline'
            ? cn('min-w-0 flex-1', compact ? 'py-2.5' : 'py-3.5')
            : compact
              ? 'px-3 pt-3'
              : 'px-4 pt-4',
        className,
      )}
      {...props}
    />
  )
})

CardHeader.displayName = 'CardHeader'

const CardTitle = forwardRef<HTMLSpanElement, HTMLAttributes<HTMLSpanElement>>(
  ({ className, children, ...props }, ref) => {
    const { emphasized, orientation } = useContext(CardContext)
    const compact = useSize().variant === 'compact'
    // A consumer's `truncate` lands on the label's grid, which can't ellipsize
    // (only a block's own line boxes can); its nowrap inherits into the cells.
    return (
      <WeightLabel
        ref={ref}
        data-slot="card-title"
        emphasized={emphasized}
        lit
        trim={orientation === 'inline'}
        truncate="inherit"
        className={cn('leading-snug', compact ? 'text-subtitle-compact' : 'text-subtitle', className)}
        {...props}
      >
        {children}
      </WeightLabel>
    )
  },
)

CardTitle.displayName = 'CardTitle'

const CardDescription = forwardRef<HTMLParagraphElement, HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => {
    const compact = useSize().variant === 'compact'
    return (
      <p
        ref={ref}
        data-slot="card-description"
        className={cn(
          'leading-normal text-muted-foreground',
          compact ? 'text-subtitle-compact' : 'text-subtitle',
          className,
        )}
        {...props}
      />
    )
  },
)

CardDescription.displayName = 'CardDescription'

/** Pinned to the header's top-right column, above the stretched overlay, so its controls stay clickable. */
const CardAction = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    data-slot="card-action"
    className={cn('relative z-30 col-start-2 row-span-2 row-start-1 self-start justify-self-end', className)}
    {...props}
  />
))

CardAction.displayName = 'CardAction'

const CardContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => {
  const { orientation } = useContext(CardContext)
  const compact = useSize().variant === 'compact'
  return (
    <div
      ref={ref}
      data-slot="card-content"
      className={cn(orientation === 'inline' ? '' : compact ? 'px-3 pt-2.5' : 'px-4 pt-3', className)}
      {...props}
    />
  )
})

CardContent.displayName = 'CardContent'

/** The actions row, above the stretched overlay; the trailing slot of an inline card. */
const CardFooter = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => {
  const { orientation, hasImage } = useContext(CardContext)
  const compact = useSize().variant === 'compact'
  return (
    <div
      ref={ref}
      data-slot="card-footer"
      className={cn(
        'relative z-30 flex items-center gap-1',
        orientation === 'inline' && hasImage
          ? 'flex-wrap'
          : orientation === 'inline'
            ? cn('shrink-0 ml-auto', compact ? 'pr-3' : 'pr-4')
            : cn('flex-wrap', compact ? 'px-3 pt-2.5' : 'px-4 pt-3'),
        className,
      )}
      {...props}
    />
  )
})

CardFooter.displayName = 'CardFooter'

const CardEyebrow = forwardRef<HTMLSpanElement, HTMLAttributes<HTMLSpanElement>>(({ className, ...props }, ref) => {
  const compact = useSize().variant === 'compact'
  return (
    <span
      ref={ref}
      data-slot="card-eyebrow"
      className={cn(
        compact ? 'text-caption-compact' : 'text-caption',
        'text-muted-foreground weight-semibold',
        className,
      )}
      {...props}
    />
  )
})

CardEyebrow.displayName = 'CardEyebrow'

/** A hairline across the card between its parts, spaced like them; vertical in an inline card. */
const CardDivider = forwardRef<HTMLHRElement, HTMLAttributes<HTMLHRElement>>(({ className, ...props }, ref) => {
  const { orientation } = useContext(CardContext)
  const compact = useSize().variant === 'compact'
  const vertical = orientation === 'inline'
  return (
    <hr
      ref={ref}
      aria-orientation={vertical ? 'vertical' : 'horizontal'}
      data-slot="card-divider"
      className={cn(
        'shrink-0 border-0 bg-border/60',
        vertical
          ? cn('h-auto w-px self-stretch', compact ? 'my-2.5' : 'my-3.5')
          : cn('h-px w-full', compact ? 'mt-2.5' : 'mt-3'),
        className,
      )}
      {...props}
    />
  )
})

CardDivider.displayName = 'CardDivider'

export { CardAction, CardContent, CardDescription, CardDivider, CardEyebrow, CardFooter, CardHeader, CardTitle }
