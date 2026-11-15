import { useSyncExternalStore } from 'react'
import { STATIC_PAGES } from '../lib/paths'

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

export const HOME_PATH = '/'

/** A page of `STATIC_PAGES` as an app path, with its title. */
export function staticPage(path: 'canvas' | '404'): { href: string; title: string } {
  const { title } = STATIC_PAGES.find(p => p.path === path)!
  return { href: `/${path}`, title }
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
