import type { ReactNode } from 'react'

/**
 * __NAME_PASCAL__ — one line on what it is and when to reach for it.
 *
 * @example {@include ./examples.mdx}
 */
export default function __NAME_PASCAL__({
  className,
  children,
}: {
  /** Extra classes on the root element. */
  className?: string
  /** Content. */
  children?: ReactNode
}) {
  return <div className={className}>{children}</div>
}
