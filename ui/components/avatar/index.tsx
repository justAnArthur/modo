/*
 * Local addition (not part of Fluid Functionalism): a person's or a team's
 * picture with a fallback, on Base UI's Avatar (the image's loading status,
 * the fallback's delay). The 1px inset edge follows upstream FF's media
 * outline; the image fades in on the fast tier.
 */

'use client'

import { Avatar as AvatarPrimitive } from '@base-ui/react/avatar'
import {
  type ComponentPropsWithoutRef,
  type ForwardRefExoticComponent,
  forwardRef,
  type ReactNode,
  type RefAttributes,
} from 'react'
import { useIcon } from '../../lib/icon-context'
import { useShape } from '../../lib/shape-context'
import { type SizeVariant, useSize } from '../../lib/size-context'
import { cn } from '../../lib/utils'
import { SizeScope } from '../../primitives/sizes'

// Literal table: UnoCSS only generates the classes it can read whole.
const BOX = { default: 'size-9', compact: 'size-7' }

type AvatarImageProps = ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>

const AvatarImage = forwardRef<HTMLImageElement, AvatarImageProps>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Image
    ref={ref}
    {...props}
    className={cn(
      // An outline paints over the image; an inset shadow would sit beneath it.
      'size-full rounded-[inherit] object-cover outline outline-1 -outline-offset-1 outline-border',
      'transition-opacity duration-fast data-[starting-style]:opacity-0',
      className,
    )}
  />
))

AvatarImage.displayName = 'AvatarImage'

type AvatarFallbackProps = ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>

const AvatarFallback = forwardRef<HTMLSpanElement, AvatarFallbackProps>(({ className, children, ...props }, ref) => {
  const size = useSize()
  const User = useIcon('user')

  return (
    <AvatarPrimitive.Fallback
      ref={ref}
      {...props}
      className={cn('flex size-full items-center justify-center rounded-[inherit]', className)}
    >
      {children ?? <User size={size.icon} strokeWidth={1.5} aria-hidden />}
    </AvatarPrimitive.Fallback>
  )
})

AvatarFallback.displayName = 'AvatarFallback'

/** A circle for people; a square for teams, organizations and things. */
type AvatarShape = 'circle' | 'square'

interface AvatarProps extends ComponentPropsWithoutRef<'span'> {
  /** Pins the avatar to one step of the size ladder (36px default, 28px compact). Defaults to the surrounding SizeProvider. */
  size?: SizeVariant
  /** A circle for people; a square for teams and things, which takes the shape's item radius (rounded or pill). Defaults to `"circle"`. */
  shape?: AvatarShape
  /** Classes for the root: a size off the ladder (`size-5` in a dense row), a ring in a stack. */
  className?: string
  /** `Avatar.Image` and `Avatar.Fallback`. */
  children?: ReactNode
}

type AvatarComponent = ForwardRefExoticComponent<AvatarProps & RefAttributes<HTMLSpanElement>> & {
  Image: typeof AvatarImage
  Fallback: typeof AvatarFallback
}

/**
 * A picture of a person or a team, with initials or an icon when there is
 * none.
 *
 * The avatar is one control tall (36px, 28px compact), so it lines up with
 * the rows and buttons beside it, and follows the surrounding SizeProvider.
 * Base UI's Avatar tracks the image: until it has loaded, or when it fails,
 * the fallback shows on a neutral ground; once it lands it fades in over the
 * fallback. A 1px inset edge keeps a pale picture from dissolving into the
 * surface. People are circles; `shape="square"` takes the shape's item
 * radius for teams and things.
 *
 * Statics:
 * - `Avatar.Image` — the picture: `src`, `alt`, `onLoadingStatusChange`.
 * - `Avatar.Fallback` — initials or an icon; empty, a person glyph. `delay`
 *   (ms) holds it back so a fast image never flashes it.
 *
 * @example {@include ./examples.mdx}
 */
const Avatar = forwardRef<HTMLSpanElement, AvatarProps>(
  ({ size: sizeProp, shape = 'circle', className, children, ...props }, ref) => {
    const size = useSize(sizeProp)
    const shapes = useShape()

    return (
      // A size prop pins the fallback's glyph too.
      <SizeScope size={sizeProp}>
        <AvatarPrimitive.Root
          ref={ref}
          {...props}
          className={cn(
            'relative inline-flex shrink-0 select-none items-center justify-center overflow-hidden align-middle',
            'bg-accent text-foreground weight-medium',
            BOX[size.variant],
            size.text,
            shape === 'circle' ? 'rounded-full' : shapes.item,
            className,
          )}
        >
          {children}
        </AvatarPrimitive.Root>
      </SizeScope>
    )
  },
) as AvatarComponent

Avatar.displayName = 'Avatar'

Object.assign(Avatar, { Image: AvatarImage, Fallback: AvatarFallback })

export type { AvatarFallbackProps, AvatarImageProps, AvatarProps, AvatarShape }
export { Avatar, AvatarFallback, AvatarImage }

export default Avatar
