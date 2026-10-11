import { pages } from 'virtual:modo-pages'
import type { ReactNode } from 'react'
import type { Tier } from '../lib/tiers'
import { ItemPage } from './items/item-page'
import { ContentPage } from './pages/ContentPage'
import { HomePage } from './pages/HomePage'
import { TierPage } from './pages/TierPage'
import { TokensPage } from './pages/TokensPage'
import { TokenGroupView } from './tokens/token-page'

interface Route {
  pattern: RegExp
  render: (match: RegExpMatchArray) => ReactNode
}

export const routes: Route[] = [
  // A `pages/index.mdx` replaces the overview.
  {
    pattern: /^\/$/,
    render: () => (pages.some(p => p.slug === 'index') ? <ContentPage slug="index" /> : <HomePage />),
  },
  { pattern: /^\/docs\/tokens$/, render: () => <TokensPage /> },
  { pattern: /^\/docs\/tokens\/([^/]+)$/, render: m => <TokenGroupView group={m[1]!} /> },
  { pattern: /^\/docs\/(primitives|components|blocks)$/, render: m => <TierPage tier={m[1] as Tier} /> },
  {
    pattern: /^\/docs\/(primitives|components|blocks)\/([^/]+)$/,
    render: m => <ItemPage tier={m[1] as Tier} id={m[2]!} />,
  },
  // Last: pages take any path outside /docs/.
  { pattern: /^\/(.+)$/, render: m => <ContentPage slug={m[1]!} /> },
]
