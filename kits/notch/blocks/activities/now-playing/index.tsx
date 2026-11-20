/*!
 * Local addition: what's playing, in every form a notch app shows it.
 * Rebuilt from Just Notch's now-playing plugin (`Player`, `Artwork`,
 * `TrackFlash`) as presentational parts: the track and the commands come in
 * as props.
 */

'use client'

import Tooltip from '@justanarthur/modo-ui/components/overlays/tooltip'
import { useReduceMotion } from '@justanarthur/modo-ui/lib/reduced-motion'
import { useSize } from '@justanarthur/modo-ui/lib/size-context'
import { SURFACE_BG } from '@justanarthur/modo-ui/lib/surface-classes'
import { useLift } from '@justanarthur/modo-ui/lib/surface-context'
import { useControllableState } from '@justanarthur/modo-ui/lib/use-controllable-state'
import { cn } from '@justanarthur/modo-ui/lib/utils'
import {
  Airplay,
  Disc3,
  Headphones,
  Heart,
  Laptop,
  Music,
  Pause,
  Play,
  Repeat,
  Repeat1,
  Shuffle,
  SkipBack,
  SkipForward,
  Speaker,
} from 'lucide-react'
import { motion } from 'motion/react'
import { type ReactNode, useState } from 'react'
import Equalizer from '../../../components/indicators/equalizer'
import MediaScrubber from '../../../components/indicators/media-scrubber'
import IslandFlash from '../../../components/island/island-flash'
import Widget, { type WidgetLayout } from '../../../components/island/widget'
import { type Artwork, type ShownArtwork, useArtworkTint, useStableArtwork } from '../../../lib/artwork'
import { contentFade, motionScale } from '../../../lib/motion'

type NowPlayingOutput = 'built-in' | 'headphones' | 'speaker' | 'airplay'
type NowPlayingRepeat = 'off' | 'all' | 'one'

interface NowPlayingTrack {
  /** What tells two tracks apart; defaults to the title, artist and album. */
  id?: string
  title: string
  artist?: string
  album?: string
  /**
   * The artwork: an image URL, or any element. `null` when the track has
   * none (the placeholder shows); left out while it isn't known yet, which
   * keeps the last picture up.
   */
  artwork?: Artwork | null
  /** The color the artwork leans to, any CSS color: it tints the glow, the bars and the toggles. Read from an image URL when left out. */
  tint?: string
  /** The app it plays in. */
  source?: string
  /** Where it plays: a device's name. */
  output?: string
  /** The device's short name for the output chip (`MacBook Pro`). Defaults to `output` without a trailing Speakers, Headphones or Output. */
  outputShort?: string
  /** What kind of device `output` is, for its glyph. Defaults to `'built-in'`. */
  outputKind?: NowPlayingOutput
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
  /** Shuffle is on (controlled). The toggle shows when this, `defaultShuffle` or `onShuffleChange` is given. */
  shuffle?: boolean
  /** Shuffle is on at first (uncontrolled). */
  defaultShuffle?: boolean
  /** Called with the new state when shuffle is pressed. */
  onShuffleChange?: (shuffle: boolean) => void
  /** The repeat mode (controlled): a press steps off → all → one. Shows like `shuffle`. */
  repeat?: NowPlayingRepeat
  /** The repeat mode at first (uncontrolled). */
  defaultRepeat?: NowPlayingRepeat
  /** Called with the next mode when repeat is pressed. */
  onRepeatChange?: (repeat: NowPlayingRepeat) => void
  /** The track is in the library (controlled). Shows like `shuffle`. */
  liked?: boolean
  /** The track is in the library at first (uncontrolled). */
  defaultLiked?: boolean
  /** Called with the new state when the heart is pressed. */
  onLikedChange?: (liked: boolean) => void
  /** The empty state's line. Defaults to `'Play something in Music, Spotify or a browser and it shows up here.'`. */
  emptyDescription?: ReactNode
  /** The empty state's way forward, such as a Button that opens a player. */
  emptyActions?: ReactNode
  /** `tall` is the open island's tall snap: the artwork large, the title on the display role, a full-width scrubber and the output chip, transport and toggles under it. Defaults to `'fit'`. */
  layout?: WidgetLayout
  /** Classes for the root, which fills its container. */
  className?: string
}

const OUTPUT_ICON = { 'built-in': Laptop, headphones: Headphones, speaker: Speaker, airplay: Airplay }
const NEXT_REPEAT: Record<NowPlayingRepeat, NowPlayingRepeat> = { off: 'all', all: 'one', one: 'off' }
const REPEAT_LABEL: Record<NowPlayingRepeat, string> = {
  off: 'Repeat',
  all: 'Repeat all',
  one: 'Repeat one',
}

const shortDevice = (name: string) => name.replace(/\s+(speakers?|headphones|output)$/i, '')

/** Where it plays, as one chip by the controls: the device's glyph, and its short name unless `glyphOnly`; the full name in its tooltip. */
function OutputChip({ track, glyphOnly }: { track: NowPlayingTrack; glyphOnly: boolean }) {
  const level = useLift(1)
  if (!track.output) return null
  const Icon = OUTPUT_ICON[track.outputKind ?? 'built-in']
  return (
    <Tooltip content={track.output}>
      <span
        // biome-ignore lint/a11y/noNoninteractiveTabindex: the tooltip's trigger, so keyboard users can read the full name
        tabIndex={0}
        role="img"
        aria-label={`Playing on ${track.output}`}
        className={cn(
          'inline-flex h-6 min-w-0 max-w-40 items-center gap-1.5 rounded-full text-caption text-muted-foreground outline-none focus-visible:ring-1 focus-visible:ring-focus-ring',
          glyphOnly ? 'w-6 justify-center' : 'px-2',
          SURFACE_BG[level],
        )}
      >
        <Icon size={14} strokeWidth={1.5} className="shrink-0" />
        {!glyphOnly && <span className="min-w-0 truncate">{track.outputShort ?? shortDevice(track.output)}</span>}
      </span>
    </Tooltip>
  )
}

type TrackIdentity = Pick<NowPlayingTrack, 'id' | 'title' | 'artist' | 'album' | 'artwork' | 'tint'>

const keyOf = (track?: TrackIdentity | null) =>
  track ? (track.id ?? [track.title, track.artist, track.album].join('\u0000')) : ''

/** The track's tint: its own, else read from its image. */
function useTint(track?: TrackIdentity | null) {
  const read = useArtworkTint(track?.tint || typeof track?.artwork !== 'string' ? undefined : track.artwork)
  return track?.tint ?? read
}

function Picture({ art, glyph }: { art: ShownArtwork['art']; glyph: number }) {
  const level = useLift(1)
  if (typeof art === 'string') return <img alt="" src={art} draggable={false} className="size-full object-cover" />
  if (art != null) return art
  return (
    <span className={cn('flex size-full items-center justify-center text-muted-foreground', SURFACE_BG[level])}>
      <Music size={glyph} strokeWidth={1.5} />
    </span>
  )
}

interface ArtworkProps {
  /** The track whose artwork it shows; without one, the placeholder. */
  track?: TrackIdentity | null
  /** The placeholder note's size in px. Defaults to `14`. */
  glyph?: number
  /** Classes for the tile: its size and radius. */
  className?: string
}

/**
 * A track's artwork in a tile that never blinks: the last good picture stays
 * while the next one loads or an update comes without one, the next
 * crossfades in over it, and only a track without artwork shows the note.
 */
function NowPlayingArtwork({ track, glyph = 14, className }: ArtworkProps) {
  const shown = useStableArtwork(track?.artwork, keyOf(track))
  const reduced = useReduceMotion()
  const [top, setTop] = useState(shown)
  const [under, setUnder] = useState<ShownArtwork | null>(null)
  if (top.id !== shown.id) {
    setUnder(top)
    setTop(shown)
  }

  return (
    <span className={cn('relative isolate block shrink-0 overflow-hidden', className)}>
      {under && (
        <span key={under.id} className="absolute inset-0">
          <Picture art={under.art} glyph={glyph} />
        </span>
      )}
      <motion.span
        key={shown.id}
        className="absolute inset-0"
        initial={under ? { opacity: 0 } : false}
        animate={{ opacity: 1 }}
        transition={reduced ? contentFade : motionScale.small}
        onAnimationComplete={() => setUnder(null)}
      >
        <Picture art={shown.art} glyph={glyph} />
      </motion.span>
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-[inherit] ring-1 ring-border ring-inset"
      />
    </span>
  )
}

interface PartProps {
  /** What plays. */
  track?: TrackIdentity | null
  /** It plays: the bars dance. Defaults to `true`. */
  playing?: boolean
}

/** Level bars in the artwork's tint. */
function TintedBars({ track, playing = true, className }: PartProps & { className?: string }) {
  const tint = useTint(track)
  return (
    <span className={cn('inline-flex text-foreground', className)} style={tint ? { color: tint } : undefined}>
      <Equalizer playing={playing} label={playing ? 'Playing' : 'Paused'} barClassName="bg-current" />
    </span>
  )
}

/** The compact island's left wing: the artwork, small. */
function NowPlayingLeading({ track }: Pick<PartProps, 'track'>) {
  return <NowPlayingArtwork track={track} glyph={12} className="size-5.5 rounded-md" />
}

/** The compact island's right wing: the level bars in the artwork's tint, low while paused. */
function NowPlayingTrailing(props: PartProps) {
  return <TintedBars {...props} />
}

/** The split island's bubble: the artwork as a disc. */
function NowPlayingMinimal({ track }: Pick<PartProps, 'track'>) {
  return <NowPlayingArtwork track={track} glyph={12} className="size-6 rounded-full" />
}

/** The island's flash when the track changes: its artwork, title and artist, and the tinted bars. */
function NowPlayingFlash({ track, playing = true }: { track: NowPlayingTrack; playing?: boolean }) {
  return (
    <IslandFlash
      icon={<NowPlayingArtwork track={track} className="size-9 rounded-lg" />}
      title={track.title || 'Unknown title'}
      caption={[track.artist, track.album].filter(Boolean).join(' — ') || track.source}
      trailing={<TintedBars track={track} playing={playing} />}
    />
  )
}

// Literal tables: UnoCSS only generates the classes it can read whole.
const ART = { default: 'size-36 rounded-xl', compact: 'size-28 rounded-xl' }
const SHEET_ART = { default: 'size-52 rounded-2xl', compact: 'size-44 rounded-2xl' }
const SHEET_TITLE = { default: 'text-display', compact: 'text-display-compact' }

function Glow({ tint, children }: { tint?: string; children: ReactNode }) {
  return (
    <span className="relative flex">
      {tint && (
        <span
          aria-hidden
          className="absolute -inset-x-8 -inset-y-4 -z-1 opacity-70"
          style={{ backgroundImage: `radial-gradient(closest-side, ${tint}, transparent)` }}
        />
      )}
      {children}
    </span>
  )
}

/**
 * What's playing, as a notch app's open island shows it: the artwork, the
 * title and artist, where the track is, the transport, and where it plays.
 *
 * The artwork is the hero's picture, as tall as the widget, with a soft glow
 * of its tint behind it (`track.tint`, else read from an image URL); the
 * equalizer and any toggle that is on take the same tint, so the color
 * comes from the music. The artwork never blinks: the last good picture
 * stays up while a new one loads or an update arrives without one, the next
 * crossfades in over it, and only a track whose `artwork` is `null` shows
 * the placeholder note.
 *
 * Under the title and artist (with the album) runs the kit's MediaScrubber,
 * which ticks on by itself while playing and seeks once when a drag ends
 * (`onSeek`), a thin line that becomes the slider on hover at either snap.
 * The transport sits in the middle of the last row, the output device as a
 * glyph chip (its name in the tooltip) and the source app on its left, and shuffle, repeat and the heart
 * on its right, each shown when its value or handler is given. Play / pause
 * runs through `playing` / `onPlayingChange`, or is kept here from
 * `defaultPlaying`; the toggles are the same. Without a track it says
 * nothing is playing and how to change that.
 *
 * At the open island's tall snap (`layout="tall"`) it becomes a sheet: the
 * artwork large beside the source app (the header, said once), the title on
 * the display role, the artist and the album on lines of their own; then the
 * same scrubber across the whole width with one row under it: the output
 * chip (glyph and short name, `outputShort`), the transport and the toggles.
 *
 * The other forms are parts: `NowPlaying.Leading` and `NowPlaying.Trailing`
 * for the compact island's wings (the artwork, and the tinted Equalizer that
 * settles when paused), `NowPlaying.Minimal` for the split island's bubble
 * (the artwork as a disc), `NowPlaying.Flash` for the flash on a track
 * change and `NowPlaying.Artwork` for the tile on its own.
 *
 * @example {@include ./examples.mdx}
 */
const NowPlaying = Object.assign(
  function NowPlaying({
    track,
    playing: playingProp,
    defaultPlaying = true,
    onPlayingChange,
    onPrevious,
    onNext,
    onSeek,
    shuffle: shuffleProp,
    defaultShuffle,
    onShuffleChange,
    repeat: repeatProp,
    defaultRepeat,
    onRepeatChange,
    liked: likedProp,
    defaultLiked,
    onLikedChange,
    emptyDescription = 'Play something in Music, Spotify or a browser and it shows up here.',
    emptyActions,
    layout = 'fit',
    className,
  }: NowPlayingProps) {
    const size = useSize()
    const [playing, setPlaying] = useControllableState(playingProp, defaultPlaying, onPlayingChange)
    const [shuffle, setShuffle] = useControllableState(shuffleProp, defaultShuffle ?? false, onShuffleChange)
    const [repeat, setRepeat] = useControllableState(repeatProp, defaultRepeat ?? 'off', onRepeatChange)
    const [liked, setLiked] = useControllableState(likedProp, defaultLiked ?? false, onLikedChange)
    const tint = useTint(track)

    if (!track)
      return (
        <Widget.Message
          layout={layout}
          icon={Music}
          title="Nothing playing"
          description={emptyDescription}
          actions={emptyActions}
          className={className}
        />
      )

    const showShuffle = shuffleProp !== undefined || defaultShuffle !== undefined || onShuffleChange !== undefined
    const showRepeat = repeatProp !== undefined || defaultRepeat !== undefined || onRepeatChange !== undefined
    const showLiked = likedProp !== undefined || defaultLiked !== undefined || onLikedChange !== undefined
    const byline = [track.artist, track.album].filter(Boolean).join(' — ')
    const toggles = (
      <>
        {showShuffle && (
          <Widget.Action
            icon={Shuffle}
            label="Shuffle"
            pressed={shuffle}
            color={tint}
            onClick={() => setShuffle(!shuffle)}
          />
        )}
        {showRepeat && (
          <Widget.Action
            icon={repeat === 'one' ? Repeat1 : Repeat}
            label={REPEAT_LABEL[repeat]}
            pressed={repeat !== 'off'}
            color={tint}
            onClick={() => setRepeat(NEXT_REPEAT[repeat])}
          />
        )}
        {showLiked && (
          <Widget.Action
            icon={Heart}
            label={liked ? 'Remove from library' : 'Add to library'}
            pressed={liked}
            filled={liked}
            color={tint}
            onClick={() => setLiked(!liked)}
          />
        )}
      </>
    )
    const transport = (
      <div className="flex items-center gap-1">
        <Widget.Action icon={SkipBack} label="Previous" filled onClick={onPrevious} />
        <Widget.Action
          icon={playing ? Pause : Play}
          label={playing ? 'Pause' : 'Play'}
          emphasis="primary"
          filled
          onClick={() => setPlaying(!playing)}
        />
        <Widget.Action icon={SkipForward} label="Next" filled onClick={onNext} />
      </div>
    )
    if (layout === 'tall')
      return (
        <Widget.Sheet className={cn('relative isolate', className)}>
          <div className="flex min-w-0 items-center gap-6">
            <Glow tint={tint}>
              <NowPlayingArtwork track={track} glyph={40} className={SHEET_ART[size.variant]} />
            </Glow>
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <Widget.Header icon={Disc3} trailing={<TintedBars track={track} playing={playing} />}>
                {track.source ?? 'Now playing'}
              </Widget.Header>
              <span className={cn('line-clamp-2 weight-bold text-foreground text-balance', SHEET_TITLE[size.variant])}>
                {track.title || 'Unknown title'}
              </span>
              {track.artist && <span className="truncate text-title text-foreground">{track.artist}</span>}
              {track.album && <Widget.Subtitle>{track.album}</Widget.Subtitle>}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            {track.duration > 0 && (
              <MediaScrubber
                quiet
                position={track.position}
                duration={track.duration}
                playing={playing}
                onSeek={onSeek}
              />
            )}
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
              <span className="flex min-w-0 items-center">
                <OutputChip track={track} glyphOnly={false} />
              </span>
              {transport}
              <div className="flex items-center justify-end">{toggles}</div>
            </div>
          </div>
        </Widget.Sheet>
      )

    return (
      <div className={cn('relative isolate flex w-full flex-col justify-center', className)}>
        <Widget
          media={
            <Glow tint={tint}>
              <NowPlayingArtwork track={track} glyph={28} className={ART[size.variant]} />
            </Glow>
          }
        >
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex min-w-0 flex-1 flex-col">
              <Widget.Title>{track.title || 'Unknown title'}</Widget.Title>
              {byline && <Widget.Subtitle>{byline}</Widget.Subtitle>}
            </div>
            <TintedBars track={track} playing={playing} className="mt-1.5" />
          </div>

          {track.duration > 0 && (
            <MediaScrubber
              className="mt-2"
              quiet
              position={track.position}
              duration={track.duration}
              playing={playing}
              onSeek={onSeek}
            />
          )}

          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <OutputChip track={track} glyphOnly />
              {track.source && (
                <Widget.Meta>
                  <Widget.MetaItem icon={Disc3}>{track.source}</Widget.MetaItem>
                </Widget.Meta>
              )}
            </div>
            {transport}
            <div className="flex items-center justify-end">{toggles}</div>
          </div>
        </Widget>
      </div>
    )
  },
  {
    Artwork: NowPlayingArtwork,
    Leading: NowPlayingLeading,
    Trailing: NowPlayingTrailing,
    Minimal: NowPlayingMinimal,
    Flash: NowPlayingFlash,
  },
)

export default NowPlaying

export type { NowPlayingOutput, NowPlayingProps, NowPlayingRepeat, NowPlayingTrack }
export { NowPlaying, NowPlayingArtwork, NowPlayingFlash, NowPlayingLeading, NowPlayingMinimal, NowPlayingTrailing }
