import './link.css'

/**
 * Inline anchor. Underlines on hover, picks up the accent color.
 *
 * @example
 * # Default
 *
 * ```tsx
 * <Link href="/docs">Read the docs</Link>
 * ```
 *
 * @example
 * # External
 *
 * ```tsx
 * <Link href="https://example.com" target="_blank">Example</Link>
 * ```
 */
export default function Link({
  href,
  children,
  className,
  ...rest
}: {
  /** Target URL. */
  href: string
  /** Link text. */
  children?: React.ReactNode
  /** Additional classes appended to `my-link`. */
  className?: string
  /** Catch-all for `target`, `rel`, etc. — not shown in the prop table. */
  [key: string]: unknown
}) {
  return (
    <a
      href={href}
      className={className ? `my-link ${className}` : 'my-link'}
      {...rest}
    >
      {children}
    </a>
  )
}
