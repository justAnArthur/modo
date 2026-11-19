import { config } from 'virtual:modo-config'
import { items } from 'virtual:modo-items'
import { DOCS_PATH, HOME_PATH, siteRouteId } from '../../lib/paths'
import { sitePages } from '../groups'
import { usePath } from '../location'

/** The pages the site view's switcher lists; the first is the one `/site` opens. */
export const SITE_PAGES = sitePages(items, config.pages?.primary)

/** Whether `/` opens the site view: asked for, and there are pages to show. */
export const SITE_HOME = (config.pages?.home ?? false) && SITE_PAGES.length > 0

/** Where the overview lives: `/`, or `/docs` while the site view holds `/`. */
export const OVERVIEW_PATH = SITE_HOME ? DOCS_PATH : HOME_PATH

/** The page id the current path shows in the site view (`''` for the first page); undefined outside it. */
export function useSiteId(): string | undefined {
  const path = usePath()
  return SITE_PAGES.length > 0 ? siteRouteId(path, SITE_HOME) : undefined
}
