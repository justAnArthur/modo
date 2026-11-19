/*!
 * Local addition: a cell's drawer open beside its grid, on mock data.
 */

'use client'

import { BusinessScreen } from '../../mock/business-screen'

interface CellDetailPageProps {
  /** The business's id in the mock workspace. Defaults to `'camasys'`. */
  id?: string
  /** The open cell, as `asset:pack/item`. Defaults to Camasys's og:video. */
  open?: string
  /** The cell's timeline entry open at first: a check's `checked_at` or a fix run's `id`. Defaults to the cell itself. */
  run?: string
}

/**
 * A cell open in the side pane: Camasys has no `og:video`. The pane shows the
 * evidence as the check wrote it, the item's why, the check as its
 * `item.yml` has it, the timeline of checks and fix runs (invented before
 * the last check), and the actions on one row: Fix with ▾ worker, Re-check,
 * and Waive behind ⋯.
 *
 * Press a timeline entry to read it in the pane: a check's log, step by
 * step, or a fix run's session ending in its PR; Back returns to the cell.
 * Press another cell to open it instead; the pane's toggle folds it. It is
 * the CellDetail block in the app's side pane.
 *
 * @example {@include ./examples.mdx}
 */
export default function CellDetailPage({ id = 'camasys', open = 'site:website/og-video', run }: CellDetailPageProps) {
  return <BusinessScreen id={id} open={open} run={run} />
}
