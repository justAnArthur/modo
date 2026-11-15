import { config } from 'virtual:modo-config'
import { type ReactNode, useEffect } from 'react'
import { TIERS, type Tier } from '../lib/tiers'
import { PageIdScope } from './anchor'
import { ItemPage } from './items/item-page'
import { appPath, BASE, NAVIGATE, usePath } from './location'
import { CanvasPage } from './pages/canvas'
import { HomePage } from './pages/home'
import { NotFoundPage } from './pages/not-found'
import { TierPage } from './pages/tier'
import { TokensPage } from './pages/tokens'
import { TokenGroupView } from './tokens/group-page'

const TIER = TIERS.join('|')

interface Route {
  pattern: RegExp
  render: (match: RegExpMatchArray) => ReactNode
}

const routes: Route[] = [
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

function scrollToHash(hash: string) {
  if (hash) document.getElementById(decodeURIComponent(hash.slice(1)))?.scrollIntoView()
}

export function Router(): ReactNode {
  const path = usePath()

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      const a = (e.target as HTMLElement | null)?.closest('a')
      if (!a || (a.target && a.target !== '_self')) return
      const url = new URL(a.href)
      if (url.origin !== window.location.origin || !url.pathname.startsWith(`${BASE}/`)) return
      e.preventDefault()
      const samePage = appPath(url.pathname) === appPath(window.location.pathname)
      window.history.pushState({}, '', url)
      if (samePage) return scrollToHash(url.hash)
      // A new page starts at its top; Back/Forward keep the browser's restore.
      window.scrollTo({ top: 0, behavior: 'instant' })
      window.dispatchEvent(new Event(NAVIGATE))
    }
    document.addEventListener('click', onClick)
    return () => document.removeEventListener('click', onClick)
  }, [])

  // The page renders after load or navigation, so the browser's own jump to
  // `#hash` misses it. The tab names the page and the design system.
  useEffect(() => {
    scrollToHash(window.location.hash)
    const title = document.querySelector('[data-modo="page-title"]')?.textContent
    document.title = title && title !== config.name ? `${title} · ${config.name}` : config.name
  }, [path])

  const route = routes.find(r => r.pattern.test(path))
  const match = route && path.match(route.pattern)
  // Keyed by path so page state (an open code panel, heading ids) doesn't carry over.
  return <PageIdScope key={path}>{route && match ? route.render(match) : <NotFoundPage />}</PageIdScope>
}
