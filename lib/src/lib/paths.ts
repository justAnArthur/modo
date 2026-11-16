import type { Tier } from './tiers'

/** The key items are stored under in the virtual modules: `tier:id`. */
export function itemKey(tier: Tier, id: string): string {
  return `${tier}:${id}`
}

/** A tier's overview as an app path (`/docs/primitives`). */
export function tierPath(tier: Tier): string {
  return `/docs/${tier}`
}

/** An item's page as an app path (`/docs/primitives/button`). */
export function itemPath(tier: Tier, id: string): string {
  return `${tierPath(tier)}/${id}`
}

/** The Foundations overview, or one token group's page, as an app path. */
export function tokenPath(group?: string): string {
  return group ? `/docs/tokens/${group}` : '/docs/tokens'
}

/** The guides' root as an app path: `guides/index.mdx` renders here. */
export const GUIDES_PATH = '/guides'

/** A guide as an app path (`/guides/theming/tokens`); the empty slug is the guides' root. */
export function guidePath(slug: string): string {
  return slug ? `${GUIDES_PATH}/${slug}` : GUIDES_PATH
}

/**
 * A URL pathname as app paths spell it: decoded (`/guides/n%C3%A1vod` → `/guides/návod`) and NFC,
 * the form guide slugs take. A malformed escape leaves it as is.
 */
export function decodePath(pathname: string): string {
  try {
    return decodeURIComponent(pathname).normalize('NFC')
  } catch {
    return pathname
  }
}

/** The overview, as an app path. */
export const HOME_PATH = '/'

/** The canvas: every foundation and item on one pan-and-zoom surface. */
export const CANVAS_PAGE = { path: '/canvas', title: 'Canvas' }

/** The page any unknown path shows. */
export const NOT_FOUND_PAGE = { path: '/404', title: 'Not found' }

/** The pages that exist whatever the design system holds. */
export const STATIC_PAGES = [CANVAS_PAGE, NOT_FOUND_PAGE]
