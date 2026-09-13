import './link.css'

/**
 * Inline anchor.
 *
 * @example
 * # Default
 *
 * ```tsx
 * <Link href="/docs">Read the docs</Link>
 * ```
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
