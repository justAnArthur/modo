/*!
 * Local addition: the just-standards Packs screen on mock data.
 */

'use client'

import { useState } from 'react'
import PackList from '../../blocks/pack-list'
import { AppWindow, ScreenHeader } from '../../mock/app-window'
import { type Pane, PaneContent } from '../../mock/business-screen'
import { BUSINESSES, PACKS, STATUS } from '../../mock/status'

interface PacksProps {
  /** What the side pane opens with: a pack or one of its items. Defaults to none. */
  pane?: Pane
}

/**
 * The packs the workspace ships, Website and Repo, with their version, items,
 * adopters and coverage across the seven businesses.
 *
 * Press a row and the pack opens in the side pane (PackDetail); an item there
 * opens the item across every business that has it (ItemDetail). It is the
 * PackList block in the app's window.
 *
 * @example {@include ./examples.mdx}
 */
export default function Packs({ pane: initial }: PacksProps) {
  const [pane, setPane] = useState(initial)
  return (
    <AppWindow
      title="Packs"
      current="packs"
      onPaneClose={() => setPane(undefined)}
      paneLabel={pane?.kind === 'item' ? 'Item' : 'Pack'}
      pane={pane && <PaneContent key={`${pane.kind}:${pane.key}`} pane={pane} onPane={setPane} />}
    >
      <ScreenHeader title="Packs" lead={`${PACKS.length} packs · ${BUSINESSES.length} businesses`} />
      <PackList
        packs={PACKS}
        businesses={BUSINESSES}
        status={STATUS}
        activePack={pane?.kind === 'pack' ? pane.key : undefined}
        onOpenPack={key => setPane({ kind: 'pack', key })}
      />
    </AppWindow>
  )
}
