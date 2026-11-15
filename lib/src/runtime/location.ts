import { useSyncExternalStore } from 'react'

export const NAVIGATE = 'modo:navigate'
// '' or the `--base` the site was built with, minus its trailing slash.
export const BASE = import.meta.env.BASE_URL.slice(0, -1)

/** An app path (`/docs/...`) as a URL under the site's base. */
export function withBase(path: string): string {
  return BASE + path
}

/** A content link's href: root-relative ones are app paths, so they get the base. */
export function contentHref(href: string): string {
  return href.startsWith('/') && !href.startsWith('//') ? withBase(href) : href
}

// Static hosts redirect a route dir to its trailing-slash form.
export function appPath(pathname: string): string {
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
