import type { ReactNode } from 'react'
import { TIERS, type Tier } from '../lib/tiers'
import { ExampleSolo } from './items/example-solo'
import { ItemPage } from './items/item-page'
import { CanvasPage } from './pages/CanvasPage'
import { HomePage } from './pages/HomePage'
import { TierPage } from './pages/TierPage'
import { TokensPage } from './pages/TokensPage'
import { TokenGroupView } from './tokens/token-page'

const TIER = TIERS.join('|')

interface Route {
  pattern: RegExp
  /** `example` is the `?example=` key, for the routes that show one example full screen. */
  render: (match: RegExpMatchArray, example: string | null) => ReactNode
}

export const routes: Route[] = [
  { pattern: /^\/$/, render: () => <HomePage /> },
  { pattern: /^\/canvas$/, render: () => <CanvasPage /> },
  { pattern: /^\/docs\/tokens$/, render: () => <TokensPage /> },
  { pattern: /^\/docs\/tokens\/([^/]+)$/, render: m => <TokenGroupView group={m[1]!} /> },
  { pattern: new RegExp(`^/docs/(${TIER})$`), render: m => <TierPage tier={m[1] as Tier} /> },
  {
    pattern: new RegExp(`^/docs/(${TIER})/([^/]+)$`),
    render: (m, example) =>
      example === null ? (
        <ItemPage tier={m[1] as Tier} id={m[2]!} />
      ) : (
        <ExampleSolo tier={m[1] as Tier} id={m[2]!} example={example} />
      ),
  },
]
