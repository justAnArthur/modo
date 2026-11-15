import { shell } from 'virtual:modo-shell'
import { withBase } from '../router'

export function NotFoundPage() {
  const { Link } = shell
  return (
    <>
      <h1 data-modo="page-title">Not found</h1>
      <p data-modo="page-lead">No page matched this URL.</p>
      <p>
        <Link href={withBase('/')}>Go to the overview</Link>
      </p>
    </>
  )
}
