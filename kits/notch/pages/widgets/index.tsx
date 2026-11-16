/*!
 * Local addition: every widget of the notch app's open island, on a Mac's
 * screen.
 */

'use client'

import { useState } from 'react'
import ExpandedIsland from '../../blocks/expanded-island'
import NowPlaying from '../../blocks/now-playing'
import Island from '../../components/island'
import type { IslandState } from '../../lib/geometry'
import { TABS } from '../../mock/data'
import { ArtworkTile, panelTabs } from '../../mock/island-content'
import { SceneDesk } from '../../mock/scene'

interface WidgetsPageProps {
  /** The tab open at first. Defaults to `'now-playing'`. */
  tab?: string
  /** Show the tabs under the screen too. Defaults to `true`. */
  picker?: boolean
}

/**
 * The open island with a tab per widget: Now Playing, Timer, Calendar,
 * Shelf, Controls, Devices and System.
 *
 * The tabs sit in the wings around the notch with settings at the far
 * right; the tab's title runs under them and its view fills a content area
 * of fixed height that scrolls a taller view. Pick a tab in the island, or
 * under the screen, which drives the same selection. Every view is a block
 * on mock data (NowPlaying, Timer, Agenda, Shelf, Controls, Devices,
 * SystemStats) inside ExpandedIsland. Escape, or a press outside the
 * controls, closes it to the music in the wings.
 *
 * @example {@include ./examples.mdx}
 */
export default function WidgetsPage({ tab: initial = 'now-playing', picker = true }: WidgetsPageProps) {
  const [tab, setTab] = useState(initial)
  const [state, setState] = useState<IslandState>('expanded')

  return (
    <SceneDesk
      picker={picker}
      scenes={TABS}
      value={tab}
      onValueChange={next => {
        setTab(next)
        setState('expanded')
      }}
      island={
        <Island
          state={state}
          onStateChange={setState}
          collapsedState="compact"
          leading={<ArtworkTile />}
          trailing={<NowPlaying.Trailing />}
          expanded={<ExpandedIsland tabs={panelTabs()} value={tab} onValueChange={setTab} onSettings={() => {}} />}
        />
      }
    />
  )
}
