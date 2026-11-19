/*!
 * Docs-only: the Business screen on mock data, the grid in the window's main
 * card and, in its side pane, a cell's drawer, an item or a pack.
 */

'use client'

import { useState } from 'react'
import BusinessGrid from '../blocks/business-grid'
import CellDetail from '../blocks/cell-detail'
import ItemDetail from '../blocks/item-detail'
import PackDetail from '../blocks/pack-detail'
import { adoptedVersion, cellKey } from '../lib/cells'
import type { Business, CellStatus } from '../lib/types'
import { AppWindow, ScreenHeader } from './app-window'
import { runsOf } from './runs'
import { BUSINESSES, NOW, PACKS, STATUS, WORKERS } from './status'

/** What the side pane shows: a cell (`asset:pack/item`), an item (`pack/item`) or a pack (its id). */
export type Pane = { kind: 'cell' | 'item' | 'pack'; key: string }

const PANE_LABEL: Record<Pane['kind'], string> = { cell: 'Cell', item: 'Item', pack: 'Pack' }

interface BusinessScreenProps {
  /** The business's id. */
  id: string
  /** The cell open in the side pane at first, as `asset:pack/item`. */
  open?: string
  /** The side pane at first, when it isn't a cell: an item or a pack. */
  pane?: Pane
  /** The failing cells picked at first. */
  selected?: string[]
  /** The open cell's timeline entry open at first: a check's `checked_at` or a fix run's `id`. */
  run?: string
}

/** The pane's content for the business screen and the Packs screen alike. */
export function PaneContent({
  pane,
  business,
  cells,
  run,
  onPane,
}: {
  pane: Pane
  /** The business whose cells and grid are on screen; the Packs screen has none. */
  business?: Business
  cells?: CellStatus[]
  run?: string
  onPane: (pane: Pane | undefined) => void
}) {
  const close = () => onPane(undefined)
  const openCell = (cell: CellStatus) => onPane({ kind: 'cell', key: cellKey(cell.asset, cell.item) })

  if (pane.kind === 'pack') {
    const pack = PACKS.find(p => p.id === pane.key)
    return (
      pack && (
        <PackDetail
          pack={pack}
          businesses={BUSINESSES}
          status={STATUS}
          onOpenItem={key => onPane({ kind: 'item', key })}
          onOpenBusiness={() => {}}
          onClose={close}
          className="h-full"
        />
      )
    )
  }

  if (pane.kind === 'item') {
    const pack = PACKS.find(p => pane.key.startsWith(`${p.id}/`))
    const item = pack?.entries.find(i => i.key === pane.key)
    const businesses = business ? [business] : BUSINESSES
    return (
      pack &&
      item && (
        <ItemDetail
          item={item}
          pack={pack}
          businesses={businesses}
          status={business && cells ? { [business.id]: cells } : STATUS}
          onOpenCell={business ? openCell : undefined}
          onOpenPack={key => onPane({ kind: 'pack', key })}
          now={NOW}
          onClose={close}
          className="h-full"
        />
      )
    )
  }

  const cell = cells?.find(c => cellKey(c.asset, c.item) === pane.key)
  const pack = cell && PACKS.find(p => cell.item.startsWith(`${p.id}/`))
  const item = pack?.entries.find(i => i.key === cell?.item)
  const asset = business?.assets.find(a => a.id === cell?.asset)
  return (
    business &&
    cell &&
    pack &&
    item &&
    asset && (
      <CellDetail
        key={pane.key}
        cell={cell}
        item={item}
        pack={pack}
        asset={asset}
        business={business}
        workers={WORKERS}
        {...runsOf(business.id, cell)}
        defaultRun={run}
        now={NOW}
        onClose={close}
        className="h-full"
      />
    )
  )
}

export function BusinessScreen({ id, open, pane: initial, selected, run }: BusinessScreenProps) {
  const business = BUSINESSES.find(b => b.id === id)!
  const cells = STATUS[id]!
  const [pane, setPane] = useState<Pane | undefined>(open ? { kind: 'cell', key: open } : initial)
  const adopted = PACKS.filter(p => adoptedVersion(business, p) !== undefined)
    .map(p => `${p.title} v${adoptedVersion(business, p)}`)
    .join(', ')
  const keyOf = (kind: Pane['kind']) => (pane?.kind === kind ? pane.key : undefined)

  return (
    <AppWindow
      title={`Businesses › ${business.name}`}
      onPaneClose={() => setPane(undefined)}
      paneLabel={pane && PANE_LABEL[pane.kind]}
      pane={
        pane && (
          <PaneContent
            key={`${pane.kind}:${pane.key}`}
            pane={pane}
            business={business}
            cells={cells}
            run={pane.kind === 'cell' && pane.key === open ? run : undefined}
            onPane={setPane}
          />
        )
      }
    >
      <ScreenHeader
        title={business.name}
        lead={`${business.assets.length} ${business.assets.length === 1 ? 'asset' : 'assets'} · ${adopted} · default worker ${business.worker}`}
      />
      <BusinessGrid
        business={business}
        packs={PACKS}
        cells={cells}
        workers={WORKERS}
        defaultSelected={selected}
        active={keyOf('cell')}
        activeItem={keyOf('item')}
        activePack={keyOf('pack')}
        onOpenCell={c => setPane({ kind: 'cell', key: cellKey(c.asset, c.item) })}
        onOpenItem={key => setPane({ kind: 'item', key })}
        onOpenPack={key => setPane({ kind: 'pack', key })}
        now={NOW}
        className="flex-1"
      />
    </AppWindow>
  )
}
