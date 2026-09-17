import type { ReactNode } from 'react'
import { Badge as ShadcnBadge } from './badge'

/**
 * shadcn/ui Badge — small status descriptor for UI elements. Pulled via
 * `bunx shadcn@latest add badge` (radix-nova style, neutral base color).
 *
 * @example # Variants
 * The six visual styles of the radix-nova badge.
 *
 * ```tsx
 * <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
 *   <Badge>Default</Badge>
 *   <Badge variant="secondary">Secondary</Badge>
 *   <Badge variant="outline">Outline</Badge>
 *   <Badge variant="ghost">Ghost</Badge>
 *   <Badge variant="destructive">Destructive</Badge>
 *   <Badge variant="link">Link</Badge>
 * </div>
 * ```
 *
 * @example # Statuses
 * Typical usage labeling outcomes.
 *
 * ```tsx
 * <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
 *   <Badge variant="outline">Draft</Badge>
 *   <Badge variant="secondary">In review</Badge>
 *   <Badge>Shipped</Badge>
 *   <Badge variant="destructive">Failed</Badge>
 * </div>
 * ```
 */
export default function Badge({ variant = 'default', children }: {
  /** Visual style. @values default, secondary, destructive, outline, ghost, link */
  variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'ghost' | 'link'
  /** Badge contents. */
  children?: ReactNode
}) {
  return <ShadcnBadge variant={variant}>{children}</ShadcnBadge>
}
