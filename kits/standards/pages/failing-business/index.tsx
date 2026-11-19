/*!
 * Local addition: the just-standards Business screen for a business that
 * fails almost everything, UTEG, with three failing cells picked for a fix.
 */

'use client'

import { BusinessScreen } from '../../mock/business-screen'

/**
 * A business with many failures, UTEG: nine of its ten Website items fail,
 * as `standards status uteg` reported them, and a worker is on robots.txt
 * (invented).
 *
 * Three failing cells are picked, so the bar above the grid reads Fix 3
 * with ▾ worker: one run, one PR. Tick the asset's box to pick every failing
 * cell, ⌘-click to add or drop one, Clear to start over.
 *
 * @example {@include ./examples.mdx}
 */
export default function FailingBusiness() {
  return (
    <BusinessScreen
      id="uteg"
      selected={['site:website/og-image', 'site:website/og-video', 'site:website/structured-data']}
    />
  )
}
