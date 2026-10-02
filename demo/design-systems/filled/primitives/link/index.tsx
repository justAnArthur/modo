import './link.css'

/**
 * Inline anchor.
 *
 * {@include ./link.mdx}
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
