/*!
 * Local addition: the notch app's now-playing screens, on a Mac's screen.
 */

'use client'

import { useState } from 'react'
import Clock from '../../blocks/activities/clock'
import NowPlaying, { type NowPlayingTrack } from '../../blocks/activities/now-playing'
import ExpandedIsland from '../../blocks/app/expanded-island'
import Island from '../../components/island/island'
import type { IslandState } from '../../lib/geometry'
import { ARTWORK_TINT, type ArtworkVariant, MockArtwork } from '../../mock/artwork'
import { useRun } from '../../mock/clock'
import { TRACKS } from '../../mock/data'
import { panelTabs } from '../../mock/island-content'
import { type Scene, SceneDesk } from '../../mock/scene'

const ART = ['aurora', 'night', 'dusk'] as const satisfies ArtworkVariant[]
const PLAYLIST: NowPlayingTrack[] = TRACKS.map((track, i) => ({
  ...track,
  ...(i === 2
    ? { artwork: null }
    : { artwork: <MockArtwork variant={ART[i] ?? 'aurora'} />, tint: ARTWORK_TINT[ART[i] ?? 'aurora'] }),
}))

const SCENES: (Scene & { state: IslandState })[] = [
  { value: 'compact', label: 'Compact', state: 'compact' },
  { value: 'split', label: 'With a Pomodoro', state: 'split' },
  { value: 'expanded', label: 'Player', state: 'expanded' },
  { value: 'flash', label: 'Track change', state: 'flash' },
  { value: 'empty', label: 'Nothing playing', state: 'expanded' },
]

interface MusicProps {
  /** The scene at first. Defaults to `'expanded'`. */
  scene?: string
  /** Show the scenes under the screen. Defaults to `true`. */
  picker?: boolean
}

/**
 * Music in the notch: the track in the wings while it plays, the player when
 * the island opens, and a moment's flash when the track changes.
 *
 * Pick a scene under the screen, or use the player: previous and next walk a
 * playlist (the artwork crossfades from one cover to the next, never through
 * a blank, and the last track has none, so its placeholder shows), play /
 * pause settles the wings' bars, and the scrubber runs on by itself. With a
 * Pomodoro round running too, the track keeps the wings and the round's ring
 * melts off into the bubble. Everything is the NowPlaying block and
 * its parts on the Island.
 *
 * @example {@include ./examples.mdx}
 */
export default function Music({ scene: initial = 'expanded', picker = true }: MusicProps) {
  const [scene, setScene] = useState(initial)
  const [index, setIndex] = useState(0)
  const [playing, setPlaying] = useState(true)
  const run = useRun('focus', { left: 0.4 })
  const current = SCENES.find(s => s.value === scene) ?? SCENES[2]!
  const track = PLAYLIST[index]!
  const step = (delta: number) => setIndex((index + delta + PLAYLIST.length) % PLAYLIST.length)

  return (
    <SceneDesk
      app="Music"
      picker={picker}
      scenes={SCENES}
      value={scene}
      onValueChange={setScene}
      island={
        <Island
          state={current.state}
          onStateChange={state => setScene(SCENES.find(s => s.state === state)?.value ?? scene)}
          collapsedState="compact"
          activity={`track:${index}`}
          leading={<NowPlaying.Leading track={track} />}
          trailing={<NowPlaying.Trailing track={track} playing={playing} />}
          minimal={<Clock.Minimal run={run} />}
          flash={<NowPlaying.Flash track={track} playing={playing} />}
          expanded={
            <ExpandedIsland
              defaultValue="now-playing"
              onSettings={() => {}}
              tabs={panelTabs({
                'now-playing': (
                  <NowPlaying
                    track={scene === 'empty' ? null : track}
                    playing={playing}
                    onPlayingChange={setPlaying}
                    onPrevious={() => step(-1)}
                    onNext={() => step(1)}
                    defaultRepeat="off"
                    defaultShuffle={false}
                    defaultLiked={false}
                  />
                ),
              })}
            />
          }
        />
      }
    />
  )
}
