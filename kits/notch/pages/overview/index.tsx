/*!
 * Local addition: the notch app's overview, the island on a Mac's screen.
 */

'use client'

import Tabs from '@justanarthur/modo-ui/components/navigation/tabs'
import { useState } from 'react'
import { ISLAND_STATES, type IslandState } from '../../lib/geometry'
import { MockDesktop } from '../../mock/desktop'
import { DemoIsland } from '../../mock/island-content'

const LABEL: Record<IslandState, string> = {
  idle: 'Idle',
  compact: 'Compact',
  split: 'Split',
  expanded: 'Expanded',
  flash: 'Flash',
}

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
 * @example {@include ./examples.mdx}
 */
export default function Overview({ state: initial = 'compact', picker = true }: OverviewProps) {
  const [state, setState] = useState<IslandState>(initial)

  return (
    <div className="flex w-full flex-col items-center gap-4">
      <MockDesktop island={<DemoIsland state={state} onStateChange={setState} expandOnHover />} />
      {picker && (
        <Tabs variant="subtle" value={state} onValueChange={value => setState(value as IslandState)}>
          <Tabs.List>
            {ISLAND_STATES.map(s => (
              <Tabs.Item key={s} value={s} label={LABEL[s]} />
            ))}
          </Tabs.List>
        </Tabs>
      )}
    </div>
  )
}
