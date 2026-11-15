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

/** The pages that exist whatever the design system holds, as static routes: path without the leading `/`. */
export const STATIC_PAGES = [
  { path: 'canvas', title: 'Canvas' },
  { path: '404', title: 'Not found' },
]
