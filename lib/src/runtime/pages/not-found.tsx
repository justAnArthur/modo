import { shell } from 'virtual:modo-shell'
import { HOME_PATH, NOT_FOUND_PAGE } from '../../lib/paths'
import { withBase } from '../location'

export function NotFoundPage() {
  const { Link } = shell
  return (
    <>
      <h1 data-modo="page-title">{NOT_FOUND_PAGE.title}</h1>
      <p data-modo="page-lead">No page matched this URL.</p>
      <p>
        <Link href={withBase(HOME_PATH)}>Go to the overview</Link>
      </p>
    </>
  )
}
