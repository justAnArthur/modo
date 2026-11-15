import { config } from 'virtual:modo-config'
import { type ReactNode, useEffect, useSyncExternalStore } from 'react'
import { PageIdScope } from './anchor'
import { NotFoundPage } from './pages/NotFoundPage'
import { routes } from './routes'

const NAVIGATE = 'modo:navigate'
// '' or the `--base` the site was built with, minus its trailing slash.
const BASE = import.meta.env.BASE_URL.slice(0, -1)

/** An app path (`/docs/...`) as a URL under the site's base. */
export function withBase(path: string): string {
  return BASE + path
}

/** A content link's href: root-relative ones are app paths, so they get the base. */
export function contentHref(href: string): string {
  return href.startsWith('/') && !href.startsWith('//') ? withBase(href) : href
}

// Static hosts redirect a route dir to its trailing-slash form.
function appPath(pathname: string): string {
  return pathname.slice(BASE.length).replace(/(.)\/$/, '$1') || '/'
}

function subscribe(onChange: () => void) {
  window.addEventListener('popstate', onChange)
  window.addEventListener(NAVIGATE, onChange)
  return () => {
    window.removeEventListener('popstate', onChange)
    window.removeEventListener(NAVIGATE, onChange)
  }
}

/** The current app path; re-renders on client navigation and history moves. */
export function usePath(): string {
  return useSyncExternalStore(subscribe, () => appPath(window.location.pathname))
}

/** The `?example=` key: an item page showing that one example full screen. */
export function useExampleParam(): string | null {
  return useSyncExternalStore(subscribe, () => new URLSearchParams(window.location.search).get('example'))
}

/** Client navigation to `url`; a new page starts at its top (Back/Forward keep the browser's restore). */
export function navigate(url: URL | string, state: unknown = {}) {
  window.history.pushState(state, '', url)
  window.scrollTo({ top: 0, behavior: 'instant' })
  window.dispatchEvent(new Event(NAVIGATE))
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
      if (url.origin !== window.location.origin || !url.pathname.startsWith(`${BASE}/`)) return
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
    const title =
      document.querySelector('[data-modo="page-title"]')?.textContent ??
      document.querySelector('[data-modo="example-solo"]')?.getAttribute('aria-label')
    document.title = title && title !== config.name ? `${title} · ${config.name}` : config.name
  }, [path, example])

  const route = routes.find(r => r.pattern.test(path))
  const match = route && path.match(route.pattern)
  // Keyed by path so page state (an open code panel, heading ids) doesn't carry over.
  return (
    <PageIdScope key={`${path}?${example}`}>
      {route && match ? route.render(match, example) : <NotFoundPage />}
    </PageIdScope>
  )
}
