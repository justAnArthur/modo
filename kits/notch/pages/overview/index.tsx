/*!
 * Local addition: the notch app's overview, the island on a Mac's screen.
 */

'use client'

import { useState } from 'react'
import { ISLAND_STATES, type IslandState } from '../../lib/geometry'
import { DemoIsland } from '../../mock/island-content'
import { SceneDesk } from '../../mock/scene'

const SCENES = ISLAND_STATES.map(state => ({ value: state, label: state.charAt(0).toUpperCase() + state.slice(1) }))

interface OverviewProps {
  /** The island's state at first. Defaults to `'compact'`. */
  state?: IslandState
  /** Show the state picker under the screen. Defaults to `true`. */
  picker?: boolean
}

/**
 * A notch app on a Mac's screen: the island hangs from the top edge over the
 * menu bar, out of the notch, and grows with what it has to show.
 *
 * Music plays in the wings (`compact`), a focus timer joins it in a bubble
 * that melts off the right end (`split`), a charger plugs in for a moment
 * (`flash`), and a press or a hover opens the panel (`expanded`) with a tab
 * per widget in the wings around the notch. Escape, or leaving the open
 * island, closes it back to where it was. The wallpaper and the menu bar are
 * made of the theme's tokens; the island stays true black in both schemes.
 *
 * The components draw the island; the blocks fill it: NowPlaying, Timer,
 * Agenda, Shelf, Controls, Devices and SystemStats each come with the parts
 * for the wings, the bubble and their flash, PowerAlert is the power
 * flashes, ExpandedIsland the open island's layout and SettingsWindow the
 * app's settings. The other pages put them on the screen: now playing,
 * every alert, every widget, two activities at once and the settings.
 *
 * @example {@include ./examples.mdx}
 */
export default function Overview({ state: initial = 'compact', picker = true }: OverviewProps) {
  const [state, setState] = useState<IslandState>(initial)

  return (
    <SceneDesk
      height={640}
      picker={picker}
      scenes={SCENES}
      value={state}
      onValueChange={value => setState(value as IslandState)}
      island={<DemoIsland state={state} onStateChange={setState} expandOnHover />}
    />
  )
}
