import type { ReactNode } from 'react'
import './__NAME__.css'

export interface __NAME_PASCAL__Props {
  /** Description of the primary prop. */
  children?: ReactNode
  /** Optional className. */
  className?: string
}

/**
 * __NAME_PASCAL__ — short description.
 *
 * @example
 * # Basic
 *
 * ```tsx
 * <__NAME_PASCAL__>Hello</__NAME_PASCAL__>
 * ```
 */
export default function __NAME_PASCAL__({ children, className }: __NAME_PASCAL__Props) {
  return <div className={className}>{children}</div>
}
