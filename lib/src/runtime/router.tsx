import { config } from 'virtual:modo-config'
import { type ReactNode, useEffect } from 'react'
import { pageTitle } from '../lib/head'
import { tierPath, tokenPath } from '../lib/paths'
import { TIERS } from '../lib/tiers'
import { PageIdScope } from './anchor'
import { ItemPage } from './items/item-page'
import { appPath, BASE, HOME_PATH, NAVIGATE, staticPage, usePath } from './location'
import { CanvasPage } from './pages/canvas'
import { HomePage } from './pages/home'
import { NotFoundPage } from './pages/not-found'
import { TierPage } from './pages/tier'
import { TokensPage } from './pages/tokens'
import { TokenGroupView } from './tokens/group-page'

/** The one segment under `parent` (`/docs/tokens/colors` → `colors`). */
function child(path: string, parent: string): string | undefined {
  const rest = path.startsWith(`${parent}/`) ? path.slice(parent.length + 1) : ''
  return rest && !rest.includes('/') ? rest : undefined
}

function page(path: string): ReactNode {
  if (path === HOME_PATH) return <HomePage />
  if (path === staticPage('canvas').href) return <CanvasPage />
  if (path === tokenPath()) return <TokensPage />
  const group = child(path, tokenPath())
  if (group) return <TokenGroupView group={group} />
  for (const tier of TIERS) {
    if (path === tierPath(tier)) return <TierPage tier={tier} />
    const id = child(path, tierPath(tier))
    if (id) return <ItemPage tier={tier} id={id} />
  }
  return <NotFoundPage />
}

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
    document.title = pageTitle(
      config.name,
      document.querySelector('[data-modo="page-title"]')?.textContent ?? undefined,
    )
  }, [path])

  // Keyed by path so page state (an open code panel, heading ids) doesn't carry over.
  return <PageIdScope key={path}>{page(path)}</PageIdScope>
}
