/**
 * Inline anchor. Also the docs chrome's Link, which passes `aria-label` on
 * icon-only heading anchors and `title` from Markdown links.
 *
 * @example {@include ./examples.mdx}
 */
export default function Link({
  href,
  children,
  ...rest
}: {
  /** Target URL. */
  href: string
  /** Link text. */
  children?: React.ReactNode
  'aria-label'?: string
  title?: string
}) {
  return (
    <a href={href} className="my-link" {...rest}>
      {children}
    </a>
  )
}
