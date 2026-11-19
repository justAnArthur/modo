/*!
 * Local addition: the just-standards Business screen on mock data, Camasys.
 */

'use client'

import { BusinessScreen } from '../../mock/business-screen'

interface BusinessProps {
  /** The business's id in the mock workspace. Defaults to `'camasys'`. */
  id?: string
}

/**
 * One business, Camasys: its website against Website v2, every cell in its
 * state, as `standards status camasys` reported it, with a few invented
 * states laid over it so each one shows: a worker on the security headers,
 * robots.txt passing the older v1 of its item, a sitemap check a week old.
 *
 * Hover a cell for its evidence; press one to open its drawer in the side
 * pane; ⌘-click failing cells to fix them together. It is the BusinessGrid
 * block in the app's window, with CellDetail in the pane.
 *
 * @example {@include ./examples.mdx}
 */
export default function Business({ id = 'camasys' }: BusinessProps) {
  return <BusinessScreen id={id} />
}
