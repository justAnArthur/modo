/*!
 * Docs-only: the Business screen on mock data, the grid in the window's main
 * card and the cell's drawer in its side pane.
 */

'use client'

import { useState } from 'react'
import BusinessGrid from '../blocks/business-grid'
import CellDetail from '../blocks/cell-detail'
import { adoptedVersion, cellKey } from '../lib/cells'
import { AppWindow, ScreenHeader } from './app-window'
import { runsOf } from './runs'
import { BUSINESSES, NOW, PACKS, STATUS, WORKERS } from './status'

interface BusinessScreenProps {
  /** The business's id. */
  id: string
  /** The cell open in the side pane at first, as `asset:pack/item`. */
  open?: string
  /** The failing cells picked at first. */
  selected?: string[]
  /** The open cell's timeline entry open at first: a check's `checked_at` or a fix run's `id`. */
  run?: string
}

export function BusinessScreen({ id, open, selected, run }: BusinessScreenProps) {
  const business = BUSINESSES.find(b => b.id === id)!
  const cells = STATUS[id]!
  const [active, setActive] = useState(open)
  const cell = cells.find(c => cellKey(c.asset, c.item) === active)
  const pack = cell && PACKS.find(p => cell.item.startsWith(`${p.id}/`))
  const item = pack?.entries.find(i => i.key === cell?.item)
  const asset = business.assets.find(a => a.id === cell?.asset)
  const adopted = PACKS.filter(p => adoptedVersion(business, p) !== undefined)
    .map(p => `${p.title} v${adoptedVersion(business, p)}`)
    .join(', ')

  return (
    <AppWindow
      title={`Businesses › ${business.name}`}
      onPaneClose={() => setActive(undefined)}
      pane={
        cell &&
        pack &&
        item &&
        asset && (
          <CellDetail
            key={active}
            cell={cell}
            item={item}
            pack={pack}
            asset={asset}
            business={business}
            workers={WORKERS}
            {...runsOf(id, cell)}
            defaultRun={active === open ? run : undefined}
            now={NOW}
            onClose={() => setActive(undefined)}
            className="h-full"
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
        active={active}
        onOpenCell={c => setActive(cellKey(c.asset, c.item))}
        now={NOW}
        className="flex-1"
      />
    </AppWindow>
  )
}
