import { config } from 'virtual:modo-config'
import { type ReactNode, useEffect } from 'react'
import { pageTitle } from '../lib/head'
import { CANVAS_PAGE, decodePath, GUIDES_PATH, HOME_PATH, tierPath, tokenPath } from '../lib/paths'
import { TIERS } from '../lib/tiers'
import { PageIdScope } from './anchor'
import { ExampleSolo } from './items/example-solo'
import { ItemPage } from './items/item-page'
import { appPath, BASE, navigate, useExampleParam, usePath } from './location'
import { CanvasPage } from './pages/canvas'
import { GuidePage } from './pages/guide'
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

function page(path: string, example: string | null): ReactNode {
  if (path === HOME_PATH) return <HomePage />
  if (path === CANVAS_PAGE.path) return <CanvasPage />
  if (path === GUIDES_PATH) return <GuidePage slug="" />
  if (path.startsWith(`${GUIDES_PATH}/`)) return <GuidePage slug={path.slice(GUIDES_PATH.length + 1)} />
  if (path === tokenPath()) return <TokensPage />
  const group = child(path, tokenPath())
  if (group) return <TokenGroupView group={group} />
  for (const tier of TIERS) {
    if (path === tierPath(tier)) return <TierPage tier={tier} />
    const id = child(path, tierPath(tier))
    if (id && example !== null) return <ExampleSolo tier={tier} id={id} example={example} />
    if (id) return <ItemPage tier={tier} id={id} />
  }
  return <NotFoundPage />
}

function scrollToHash(hash: string) {
  if (hash) document.getElementById(decodeURIComponent(hash.slice(1)))?.scrollIntoView()
}

export function Router(): ReactNode {
  const path = usePath()
  const example = useExampleParam()

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      const a = (e.target as HTMLElement | null)?.closest('a')
      if (!a || (a.target && a.target !== '_self')) return
      const url = new URL(a.href)
      if (url.origin !== window.location.origin || !decodePath(url.pathname).startsWith(`${BASE}/`)) return
      e.preventDefault()
      const samePage =
        appPath(url.pathname) === appPath(window.location.pathname) && url.search === window.location.search
      if (!samePage) return navigate(url)
      window.history.pushState({}, '', url)
      scrollToHash(url.hash)
    }
    document.addEventListener('click', onClick)
    return () => document.removeEventListener('click', onClick)
  }, [])

  // The page renders after load or navigation, so the browser's own jump to
  // `#hash` misses it. The tab names the page (or the full-screen example) and the design system.
  useEffect(() => {
    scrollToHash(window.location.hash)
    document.title = pageTitle(
      config.name,
      document.querySelector('[data-modo="page-title"]')?.textContent ??
        document.querySelector('[data-modo="example-solo"]')?.getAttribute('aria-label') ??
        undefined,
    )
  }, [path, example])

  // Keyed by page so its state (an open code panel, heading ids) doesn't carry over.
  return <PageIdScope key={`${path}?${example}`}>{page(path, example)}</PageIdScope>
}
