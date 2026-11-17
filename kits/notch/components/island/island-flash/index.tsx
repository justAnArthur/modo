/*!
 * Local addition: the layout of a notch app's transient alert, the island's
 * `flash` content. Generalised from Just Notch's power, HUD and now-playing
 * flashes; the kit's blocks build their own on it.
 */

import { cn } from '@justanarthur/modo-ui/lib/utils'
import type { ReactNode } from 'react'

type IslandFlashTone = 'default' | 'success' | 'warning' | 'error' | 'info'

// Literal table: UnoCSS only generates the classes it can read whole.
const TONE: Record<IslandFlashTone, string> = {
  default: 'text-foreground',
  success: 'text-status-success',
  warning: 'text-status-warning',
  error: 'text-status-error',
  info: 'text-status-info',
}

interface IslandFlashProps {
  /** What happened, in a few words. */
  title: ReactNode
  /** One line more: how long, what to do. */
  caption?: ReactNode
  /** The glyph at the start: an icon, an artwork tile. It takes the tone's hue. */
  icon?: ReactNode
  /** The hue of the icon and the `value`. Defaults to `'default'`. */
  tone?: IslandFlashTone
  /** A figure at the end, in the tone's hue: `15 min`, a level. */
  value?: ReactNode
  /** Content after it, such as an Equalizer. */
  trailing?: ReactNode
  /** One control at the far end, such as a ghost Button. */
  action?: ReactNode
  /** Classes for the row. */
  className?: string
}

/**
 * A moment's alert in the island: an icon, what happened, a line more, and
 * the figure or control it's about.
 *
 * It lays out one row the height of the island's flash: the icon in a fixed
 * square, the title and caption truncating beside it, then the `value`, any
 * `trailing` glyph and an `action`. The icon and the value take the tone's
 * status hue (a focus round done in success, rain coming in warning); everything else
 * keeps the two text colors. Pass it as the Island's `flash`.
 *
 * @example {@include ./examples.mdx}
 */
export default function IslandFlash({
  title,
  caption,
  icon,
  tone = 'default',
  value,
  trailing,
  action,
  className,
}: IslandFlashProps) {
  return (
    <div className={cn('flex min-w-0 items-center gap-3', className)}>
      {icon && <span className={cn('flex size-8 shrink-0 items-center justify-center', TONE[tone])}>{icon}</span>}
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-body weight-semibold text-foreground">{title}</span>
        {caption && <span className="truncate text-caption text-muted-foreground">{caption}</span>}
      </div>
      {value !== undefined && (
        <span className={cn('shrink-0 text-subtitle weight-semibold tabular-nums', TONE[tone])}>{value}</span>
      )}
      {trailing}
      {action && <span className="flex shrink-0 items-center">{action}</span>}
    </div>
  )
}

export type { IslandFlashProps, IslandFlashTone }
export { IslandFlash }
