/*!
 * Local addition: the just-standards Businesses screen on mock data.
 */

'use client'

import BusinessesOverview from '../../blocks/businesses-overview'
import { AppWindow, ScreenHeader } from '../../mock/app-window'
import { BUSINESSES, FAKE_BUSINESSES, FAKE_STATUS, PACKS, STATUS } from '../../mock/status'

interface OverviewProps {
  /** Add the 25 fake businesses to the seven real ones. Defaults to `false`. */
  dense?: boolean
}

/**
 * just-standards: every business I run, measured against packs of standards,
 * and the failing cells handed to an AI worker to fix.
 *
 * The Businesses screen opens the app: one row per business, one column per
 * pack, each cell that pack's coverage and its failing cells, a pack a
 * business hasn't adopted dashed, never red; the info button by the table's
 * count says so. The real data is the workspace's seven businesses as
 * `standards status` checked them; `dense` adds 25 fake ones on `.example`
 * hosts to show the table at 32 rows.
 *
 * The components draw a cell (StateCell), a coverage figure (CoverageMeter),
 * a pack's cell on this screen (PackCoverageCell) and the Fix with ▾ worker
 * action (WorkerPicker); the blocks are this table (BusinessesOverview), one
 * business's grid (BusinessGrid) and a cell's drawer (CellDetail). The other
 * pages put them in the app's window: a business, a business with many
 * failures, and a cell open beside its grid.
 *
 * @example {@include ./examples.mdx}
 */
export default function Overview({ dense = false }: OverviewProps) {
  const businesses = dense ? [...BUSINESSES, ...FAKE_BUSINESSES] : BUSINESSES
  return (
    <AppWindow title="Businesses">
      <ScreenHeader title="Businesses" />
      <BusinessesOverview
        businesses={businesses}
        packs={PACKS}
        status={dense ? { ...STATUS, ...FAKE_STATUS } : STATUS}
        onOpenBusiness={() => {}}
        onAddBusiness={() => {}}
        className="flex-1"
      />
    </AppWindow>
  )
}
