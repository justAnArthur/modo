import { byId, byName } from 'virtual:modo-items'
import { itemKey } from '../../lib/paths'
import { ExampleBoundary } from '../items/examples'
import { ExamplePreview, hasPreview } from '../items/preview'
import { SiteIndicator } from './indicator'
import { SITE_PAGES } from './routes'

/**
 * One page of the `pages/` tier across the whole viewport, as the website it is: its first example
 * (else the bare component), no docs chrome, and the floating indicator to switch pages.
 */
export function SiteView({ id }: { id: string }) {
  const entry = id ? byId[itemKey('pages', id)] : SITE_PAGES[0]
  const Page = entry && byName[entry.name]
  return (
    <div data-modo="site" data-title={entry?.name ?? 'Not found'}>
      <div data-modo="site-page">
        {entry && hasPreview(entry) ? <ExamplePreview entry={entry} /> : null}
        {entry && !hasPreview(entry) && Page ? (
          <ExampleBoundary>
            <Page />
          </ExampleBoundary>
        ) : null}
        {entry ? null : <p data-modo="page-lead">No page “{id}”.</p>}
      </div>
      <SiteIndicator current={entry} />
    </div>
  )
}
