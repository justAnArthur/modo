import { useSyncExternalStore } from 'react'
import { decodePath, EXAMPLE_PARAM } from '../lib/paths'

export const NAVIGATE = 'modo:navigate'
// '' or the `--base` the site was built with, minus its trailing slash.
export const BASE = import.meta.env.BASE_URL.slice(0, -1)

/** An app path (`/docs/...`, a guide's `/guides/návod`) as a URL under the site's base, escaped. */
export function withBase(path: string): string {
  return BASE + encodeURI(path)
}

/** A content link's href: root-relative ones are app paths, so they get the base (as written: it may be escaped already). */
export function contentHref(href: string): string {
  return href.startsWith('/') && !href.startsWith('//') ? BASE + href : href
}

// Static hosts redirect a route dir to its trailing-slash form.
export function appPath(pathname: string): string {
  return (
    decodePath(pathname)
      .slice(BASE.length)
      .replace(/(.)\/$/, '$1') || '/'
  )
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

/** The `?example=` key: the item page shows that one example full screen. */
export function useExampleParam(): string | null {
  return useSyncExternalStore(subscribe, () => new URLSearchParams(window.location.search).get(EXAMPLE_PARAM))
}

/** Client navigation to another page, which starts at its top (Back/Forward keep the browser's restore). */
export function navigate(url: URL | string, state: unknown = {}) {
  window.history.pushState(state, '', url)
  window.scrollTo({ top: 0, behavior: 'instant' })
  window.dispatchEvent(new Event(NAVIGATE))
}
