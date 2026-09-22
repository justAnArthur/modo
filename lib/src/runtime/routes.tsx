import type { ReactNode } from 'react'
import { HomePage } from './pages/HomePage'
import { TokensPage } from './pages/TokensPage'
import { TokenGroupPage } from './pages/TokenGroupPage'
import { TierPage } from './pages/TierPage'
import { PrimitivePage } from './pages/PrimitivePage'
import { ComponentPage } from './pages/ComponentPage'
import { BlockPage } from './pages/BlockPage'

export interface Route {
  pattern: RegExp
  render: (match: RegExpMatchArray) => ReactNode
}

export const routes: Route[] = [
  { pattern: /^\/$/, render: () => <HomePage /> },
  { pattern: /^\/docs\/tokens$/, render: () => <TokensPage /> },
  {
    pattern: /^\/docs\/tokens\/([^/]+)$/,
    render: (m) => <TokenGroupPage group={m[1] ?? ''} />,
  },
  { pattern: /^\/docs\/primitives$/, render: () => <TierPage tier="primitives" /> },
  {
    pattern: /^\/docs\/primitives\/([^/]+)$/,
    render: (m) => <PrimitivePage id={m[1] ?? ''} />,
  },
  { pattern: /^\/docs\/components$/, render: () => <TierPage tier="components" /> },
  {
    pattern: /^\/docs\/components\/([^/]+)$/,
    render: (m) => <ComponentPage id={m[1] ?? ''} />,
  },
  { pattern: /^\/docs\/blocks$/, render: () => <TierPage tier="blocks" /> },
  {
    pattern: /^\/docs\/blocks\/([^/]+)$/,
    render: (m) => <BlockPage id={m[1] ?? ''} />,
  },
]
