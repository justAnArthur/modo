import { shell } from 'virtual:modo-shell'
import { HOME_PATH, staticPage, withBase } from '../location'

export function NotFoundPage() {
  const { Link } = shell
  return (
    <>
      <h1 data-modo="page-title">{staticPage('404').title}</h1>
      <p data-modo="page-lead">No page matched this URL.</p>
      <p>
        <Link href={withBase(HOME_PATH)}>Go to the overview</Link>
      </p>
    </>
  )
}
