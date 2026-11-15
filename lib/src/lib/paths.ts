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

/** The overview, as an app path. */
export const HOME_PATH = '/'

/** The canvas: every foundation and item on one pan-and-zoom surface. */
export const CANVAS_PAGE = { path: '/canvas', title: 'Canvas' }

/** The page any unknown path shows. */
export const NOT_FOUND_PAGE = { path: '/404', title: 'Not found' }

/** The pages that exist whatever the design system holds. */
export const STATIC_PAGES = [CANVAS_PAGE, NOT_FOUND_PAGE]
