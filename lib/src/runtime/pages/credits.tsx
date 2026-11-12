import { items } from 'virtual:modo-items'
import { shell } from 'virtual:modo-shell'
import { credits } from '../../lib/item-meta'
import { Heading } from '../anchor'
import { count } from '../text'

/** The upstreams the items' `@source` / `@license` tags cite, listed once for the whole system. */
export function Credits() {
  const list = credits(items.map(it => it.tags))
  if (list.length === 0) return null
  return (
    <section data-modo="credits">
      <Heading level={2} label="Credits" modo="section-title" />
      <ul data-modo="credits-list">
        {list.map(credit => (
          <li key={credit.label} data-modo="credit">
            <shell.Link href={credit.href}>{credit.label}</shell.Link>
            {credit.licenses.map(license => (
              <span key={license}>{license}</span>
            ))}
            <span>{count(credit.items, 'item')}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
