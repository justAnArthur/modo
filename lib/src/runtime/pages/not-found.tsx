import { shell } from 'virtual:modo-shell'
import { NOT_FOUND_PAGE } from '../../lib/paths'
import { withBase } from '../location'
import { OVERVIEW_PATH } from '../site/routes'

export function NotFoundPage() {
  const { Link } = shell
  return (
    <>
      <h1 data-modo="page-title">{NOT_FOUND_PAGE.title}</h1>
      <p data-modo="page-lead">No page matched this URL.</p>
      <p>
        <Link href={withBase(OVERVIEW_PATH)}>Go to the overview</Link>
      </p>
    </>
  )
}
