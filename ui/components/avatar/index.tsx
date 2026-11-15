/*!
 * Local addition (not part of Fluid Functionalism): a small letter tile or
 * picture for a person, a profile or a workspace, generalised from the AI
 * app's profile tile. Its corners follow the shape mode.
 */

'use client'

import type { ReactNode } from 'react'
import { useShape } from '../../lib/shape-context'
import { cn } from '../../lib/utils'

type AvatarTone = 'ink' | 'accent'
type AvatarSize = 'sm' | 'md'

// Literal tables: UnoCSS only generates the classes it can read whole.
const TONE: Record<AvatarTone, string> = {
  ink: 'bg-foreground text-background',
  accent: 'bg-accent text-foreground',
}
const SIZE: Record<AvatarSize, string> = {
  sm: 'size-4',
  md: 'size-5',
}

interface AvatarProps {
  /** Who or what it stands for: its first letter fills the tile, and it is the accessible name. */
  name: string
  /** A picture to show instead of the letter. */
  src?: string
  /** The tile's fill: ink (the text color) or accent. Defaults to `'ink'`. */
  tone?: AvatarTone
  /** 16px (`sm`) or 20px (`md`). Defaults to `'md'`. */
  size?: AvatarSize
  /** Classes for the tile. */
  className?: string
}

/**
 * A small tile for a person, a profile or a workspace: its first letter, or
 * its picture.
 *
 * The letter sits on an ink or accent fill, so two kinds (your own account and
 * a connected one, say) read apart at a glance. Its corners follow the shape
 * mode: rounded in the rounded mode, a circle in the pill mode.
 *
 * Statics:
 * - `Avatar.Group` — overlaps its avatars into a stack: `children`, `className`.
 *
 * @example {@include ./examples.mdx}
 */
function Avatar({ name, src, tone = 'ink', size = 'md', className }: AvatarProps) {
  const shape = useShape()

  return (
    <span
      role="img"
      aria-label={name}
      className={cn(
        'flex shrink-0 items-center justify-center overflow-hidden text-micro-compact weight-semibold',
        TONE[tone],
        SIZE[size],
        shape.bgRadius >= 20 ? 'rounded-full' : 'rounded-md',
        className,
      )}
    >
      {src ? (
        <img src={src} alt="" className="size-full object-cover" />
      ) : (
        <span aria-hidden="true">{name.slice(0, 1).toUpperCase()}</span>
      )}
    </span>
  )
}

interface AvatarGroupProps {
  /** The avatars, each overlapping the one before. */
  children: ReactNode
  /** Classes for the stack. */
  className?: string
}

function AvatarGroup({ children, className }: AvatarGroupProps) {
  // A ring in the page color cuts each avatar out of the one it overlaps.
  return <span className={cn('flex -space-x-1 [&>*]:ring-1 [&>*]:ring-background', className)}>{children}</span>
}

Avatar.Group = AvatarGroup

export type { AvatarGroupProps, AvatarProps }
export { Avatar, AvatarGroup }

export default Avatar
