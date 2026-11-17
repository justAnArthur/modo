/*
 * Mock: album art and file previews for the docs, made only of tokens (a
 * gradient across the theme's hues), so nothing loads and both schemes hold.
 */

import { cn } from '@justanarthur/modo-ui/lib/utils'
import type { NowPlayingTrack } from '../blocks/activities/now-playing'
import { TRACK } from './data'

export type ArtworkVariant = 'aurora' | 'dusk' | 'night'

// Literal table: UnoCSS only generates the classes it can read whole.
const FILL: Record<ArtworkVariant, string> = {
  aurora: 'bg-linear-to-br from-status-info via-brand to-status-success',
  dusk: 'bg-linear-to-br from-status-warning via-status-error to-brand',
  night: 'bg-linear-to-tr from-ink via-brand to-status-info',
}

/** The color each variant leans to: the artwork's tint, data a player would read from the image. */
export const ARTWORK_TINT: Record<ArtworkVariant, string> = {
  aurora: 'var(--badge-cyan)',
  dusk: 'var(--badge-orange)',
  night: 'var(--badge-violet)',
}

/** A square of generated art that fills its tile. */
export function MockArtwork({ variant = 'aurora', className }: { variant?: ArtworkVariant; className?: string }) {
  return (
    <span aria-hidden className={cn('relative block size-full overflow-hidden', FILL[variant], className)}>
      <span className="absolute -right-1/4 -bottom-1/4 size-3/4 rounded-full bg-ink/25" />
      <span className="absolute top-1/5 left-1/5 size-1/4 rounded-full bg-thumb/40" />
    </span>
  )
}

/** The mock track, with generated artwork. */
export const PLAYING: NowPlayingTrack = { ...TRACK, artwork: <MockArtwork />, tint: ARTWORK_TINT.aurora }
