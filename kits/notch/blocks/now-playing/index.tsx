/*!
 * Local addition: what's playing, in every form a notch app shows it.
 * Rebuilt from Just Notch's now-playing plugin (`Player`, `Artwork`,
 * `TrackFlash`) as presentational parts: the track and the commands come in
 * as props.
 */

'use client'

import Button from '@justanarthur/modo-ui/components/button'
import EmptyState from '@justanarthur/modo-ui/components/empty-state'
import { useControllableState } from '@justanarthur/modo-ui/lib/use-controllable-state'
import { cn } from '@justanarthur/modo-ui/lib/utils'
import { Music, Pause, Play, SkipBack, SkipForward } from 'lucide-react'
import type { ReactNode } from 'react'
import Equalizer from '../../components/equalizer'
import IslandFlash from '../../components/island-flash'
import MediaScrubber from '../../components/media-scrubber'

interface NowPlayingTrack {
  title: string
  artist?: string
  album?: string
  /** The artwork: an image URL, or any element (an `<img>`, a generated tile). */
  artwork?: string | ReactNode
  /** The app it plays in, shown under the controls. */
  source?: string
  /** The track's length, in seconds; `0` for a stream, which hides the scrubber. */
  duration: number
  /** Where playback is, in seconds. */
  position: number
}

interface NowPlayingProps {
  /** What plays; without one the player says nothing is playing. */
  track?: NowPlayingTrack | null
  /** It plays (controlled). */
  playing?: boolean
  /** It plays at first (uncontrolled). Defaults to `true`. */
  defaultPlaying?: boolean
  /** Called with the new state when play / pause is pressed. */
  onPlayingChange?: (playing: boolean) => void
  /** Called when the previous button is pressed. */
  onPrevious?: () => void
  /** Called when the next button is pressed. */
  onNext?: () => void
  /** Called with the position to seek to, once, when a drag on the scrubber ends. */
  onSeek?: (seconds: number) => void
  /** The empty state's line. Defaults to `'Play something in Music, Spotify or a browser.'`. */
  emptyDescription?: ReactNode
  /** Classes for the root, which fills its container. */
  className?: string
}

const GLYPH = { strokeWidth: 1.5, fill: 'currentColor', strokeLinejoin: 'round' } as const

interface ArtworkProps {
  /** The track's artwork; without one, a note on a tile one surface up. */
  artwork?: string | ReactNode
  /** The note's size in px when there is no artwork. Defaults to `14`. */
  glyph?: number
  /** Classes for the tile: its size and radius. */
  className?: string
}

/** A track's artwork in a tile, or a note on a raised tile when it has none. */
function NowPlayingArtwork({ artwork, glyph = 14, className }: ArtworkProps) {
  return (
    <span
      className={cn(
        'flex shrink-0 items-center justify-center overflow-hidden bg-surface-3 text-muted-foreground',
        className,
      )}
    >
      {typeof artwork === 'string' ? (
        <img alt="" src={artwork} draggable={false} className="size-full object-cover" />
      ) : (
        (artwork ?? <Music size={glyph} strokeWidth={1.5} />)
      )}
    </span>
  )
}

/** The compact island's left wing: the artwork, small. */
function NowPlayingLeading({ track }: { track?: Pick<NowPlayingTrack, 'artwork'> | null }) {
  return <NowPlayingArtwork artwork={track?.artwork} glyph={12} className="size-5.5 rounded-md" />
}

/** The compact island's right wing: the level bars, low while paused. */
function NowPlayingTrailing({ playing = true }: { playing?: boolean }) {
  return <Equalizer playing={playing} label={playing ? 'Playing' : 'Paused'} />
}

/** The split island's bubble: the artwork as a disc. */
function NowPlayingMinimal({ track }: { track?: Pick<NowPlayingTrack, 'artwork'> | null }) {
  return <NowPlayingArtwork artwork={track?.artwork} glyph={12} className="size-6 rounded-full" />
}

/** The island's flash when the track changes: its artwork, title and artist, and the bars. */
function NowPlayingFlash({ track, playing = true }: { track: NowPlayingTrack; playing?: boolean }) {
  return (
    <IslandFlash
      icon={<NowPlayingArtwork artwork={track.artwork} className="size-8 rounded-lg" />}
      title={track.title || 'Unknown title'}
      caption={track.artist || track.album || track.source}
      trailing={<Equalizer playing={playing} />}
    />
  )
}

interface ControlsProps {
  playing: boolean
  onToggle: () => void
  onPrevious?: () => void
  onNext?: () => void
}

function Controls({ playing, onToggle, onPrevious, onNext }: ControlsProps) {
  return (
    <div className="flex items-center gap-2">
      <Button variant="ghost" size="icon" aria-label="Previous" onClick={onPrevious}>
        <SkipBack {...GLYPH} size={16} />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="text-foreground"
        aria-label={playing ? 'Pause' : 'Play'}
        onClick={onToggle}
      >
        {playing ? <Pause {...GLYPH} size={18} /> : <Play {...GLYPH} size={18} />}
      </Button>
      <Button variant="ghost" size="icon" aria-label="Next" onClick={onNext}>
        <SkipForward {...GLYPH} size={16} />
      </Button>
    </div>
  )
}

/**
 * What's playing, as a notch app's open island shows it: the artwork, the
 * title and artist, where the track is, and the transport.
 *
 * The scrubber is the kit's MediaScrubber: it runs on by itself while
 * playing and seeks once when a drag ends (`onSeek`). Play / pause is
 * controlled through `playing` / `onPlayingChange`, or kept here from
 * `defaultPlaying`; previous and next report their press. Without artwork a
 * big square would be an empty box, so a small note tile leads the title row
 * instead. Without a track it says nothing is playing.
 *
 * The other forms are parts: `NowPlaying.Leading` and `NowPlaying.Trailing`
 * for the compact island's wings (the artwork, and an Equalizer that settles
 * when paused), `NowPlaying.Minimal` for the split island's bubble (the
 * artwork as a disc), `NowPlaying.Flash` for the flash on a track change and
 * `NowPlaying.Artwork` for the tile on its own.
 *
 * @example {@include ./examples.mdx}
 */
function NowPlaying({
  track,
  playing: playingProp,
  defaultPlaying = true,
  onPlayingChange,
  onPrevious,
  onNext,
  onSeek,
  emptyDescription = 'Play something in Music, Spotify or a browser.',
  className,
}: NowPlayingProps) {
  const [playing, setPlaying] = useControllableState(playingProp, defaultPlaying, onPlayingChange)

  if (!track)
    return (
      <div className={cn('flex size-full items-center justify-center', className)}>
        <EmptyState size="compact" icon={Music} title="Nothing playing" description={emptyDescription} />
      </div>
    )

  const art = track.artwork !== undefined
  return (
    <div className={cn('flex size-full items-center gap-5', className)}>
      {art && <NowPlayingArtwork artwork={track.artwork} className="size-30 rounded-2xl" />}
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex items-center gap-3">
          {!art && <NowPlayingArtwork glyph={18} className="size-10 rounded-xl" />}
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-subtitle weight-semibold text-foreground">
              {track.title || 'Unknown title'}
            </span>
            {(track.artist || track.album) && (
              <span className="truncate text-caption text-muted-foreground">{track.artist || track.album}</span>
            )}
          </div>
          <Equalizer playing={playing} />
        </div>
        {track.duration > 0 && (
          <MediaScrubber position={track.position} duration={track.duration} playing={playing} onSeek={onSeek} />
        )}
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <span className="truncate text-caption text-muted-foreground">{track.source}</span>
          <Controls playing={playing} onToggle={() => setPlaying(!playing)} onPrevious={onPrevious} onNext={onNext} />
          <span />
        </div>
      </div>
    </div>
  )
}

NowPlaying.Artwork = NowPlayingArtwork
NowPlaying.Leading = NowPlayingLeading
NowPlaying.Trailing = NowPlayingTrailing
NowPlaying.Minimal = NowPlayingMinimal
NowPlaying.Flash = NowPlayingFlash

export default NowPlaying

export type { NowPlayingProps, NowPlayingTrack }
export { NowPlaying, NowPlayingArtwork, NowPlayingFlash, NowPlayingLeading, NowPlayingMinimal, NowPlayingTrailing }
