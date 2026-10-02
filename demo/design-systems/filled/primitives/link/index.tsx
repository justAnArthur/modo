import './link.css'

/**
 * Inline anchor.
 */
export default function Link({ href, children }: {
  /** Target URL. */
  href: string
  /** Link text. */
  children?: React.ReactNode
}) {
  return (
    <a href={href} className="my-link">
      {children}
    </a>
  )
}
