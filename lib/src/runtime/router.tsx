import { Fragment, type ReactNode, useEffect, useRef, useSyncExternalStore } from 'react'
import { NotFoundPage } from './pages/NotFoundPage'
import { routes } from './routes'

const NAVIGATE = 'modo:navigate'
// '' or the `--base` the site was built with, minus its trailing slash.
const BASE = import.meta.env.BASE_URL.slice(0, -1)

/** An app path (`/docs/...`) as a URL under the site's base. */
export function withBase(path: string): string {
  return BASE + path
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
  // Static hosts redirect a route dir to its trailing-slash form.
  return useSyncExternalStore(
    subscribe,
    () => window.location.pathname.slice(BASE.length).replace(/(.)\/$/, '$1') || '/',
  )
}

export function Router(): ReactNode {
  const path = usePath()
  const first = useRef(true)

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      const a = (e.target as HTMLElement | null)?.closest('a')
      if (!a) return
      const href = a.getAttribute('href')
      if (!href?.startsWith(`${BASE}/`)) return
      if (a.target && a.target !== '_self') return
      e.preventDefault()
      window.history.pushState({}, '', href)
      window.dispatchEvent(new Event(NAVIGATE))
    }
    document.addEventListener('click', onClick)
    return () => document.removeEventListener('click', onClick)
  }, [])

  // The page renders after load, so the browser's own jump to `#hash` misses;
  // a first render keeps the restored scroll position otherwise.
  useEffect(() => {
    const target = window.location.hash && document.getElementById(decodeURIComponent(window.location.hash.slice(1)))
    if (target) target.scrollIntoView()
    else if (!first.current) window.scrollTo({ top: 0, behavior: 'instant' })
    first.current = false
  }, [path])

  for (const r of routes) {
    const m = path.match(r.pattern)
    // Keyed by path so page state (an open code panel) doesn't carry over.
    if (m) return <Fragment key={path}>{r.render(m)}</Fragment>
  }

  return <NotFoundPage />
}
