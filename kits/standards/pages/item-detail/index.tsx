/*!
 * Local addition: an item, or its pack, open beside its grid, on mock data.
 */

'use client'

import { BusinessScreen, type Pane } from '../../mock/business-screen'

interface ItemDetailPageProps {
  /** The business's id in the mock workspace. Defaults to `'camasys'`. */
  id?: string
  /** What the side pane opens with. Defaults to Website's `og:video`. */
  pane?: Pane
}

/**
 * An item open in the side pane: press a column head of the grid, here
 * Camasys's `og:video`. The pane says what the item asks and why, its check
 * as its `item.yml` has it, the recipe a worker is told, and where Camasys's
 * site stands on it; the head is lit and so is its column.
 *
 * Press a pack's head (Website v2 and its coverage) for the pack instead: its items
 * with their coverage, its changelog and who adopted it. From the pane, the
 * pack's name opens the pack, an item row opens the item, and the asset row
 * opens its cell. It is the ItemDetail and PackDetail blocks in the app's
 * side pane, beside BusinessGrid.
 *
 * @example {@include ./examples.mdx}
 */
export default function ItemDetailPage({
  id = 'camasys',
  pane = { kind: 'item', key: 'website/og-video' },
}: ItemDetailPageProps) {
  return <BusinessScreen id={id} pane={pane} />
}
