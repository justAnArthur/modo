import type { ReactNode } from 'react'
import { TIERS, type Tier } from '../lib/tiers'
import { ItemPage } from './items/item-page'
import { CanvasPage } from './pages/CanvasPage'
import { HomePage } from './pages/HomePage'
import { TierPage } from './pages/TierPage'
import { TokensPage } from './pages/TokensPage'
import { TokenGroupView } from './tokens/token-page'

const TIER = TIERS.join('|')

interface Route {
  pattern: RegExp
  render: (match: RegExpMatchArray) => ReactNode
}

export const routes: Route[] = [
  { pattern: /^\/$/, render: () => <HomePage /> },
  { pattern: /^\/canvas$/, render: () => <CanvasPage /> },
  { pattern: /^\/docs\/tokens$/, render: () => <TokensPage /> },
  { pattern: /^\/docs\/tokens\/([^/]+)$/, render: m => <TokenGroupView group={m[1]!} /> },
  { pattern: new RegExp(`^/docs/(${TIER})$`), render: m => <TierPage tier={m[1] as Tier} /> },
  {
    pattern: new RegExp(`^/docs/(${TIER})/([^/]+)$`),
    render: m => <ItemPage tier={m[1] as Tier} id={m[2]!} />,
  },
]
