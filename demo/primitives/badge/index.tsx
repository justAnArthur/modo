import './badge.css'

/**
 * Small inline pill for status, count, or tag.
 *
 * @example
 * # Default
 *
 * ```tsx
 * <Badge>New</Badge>
 * ```
 *
 * @example
 * # Secondary
 *
 * Lower-contrast — use in dense lists.
 *
 * ```tsx
 * <Badge variant="secondary">Draft</Badge>
 * ```
 *
 * @example
 * # Outline
 *
 * Bordered, transparent.
 *
 * ```tsx
 * <Badge variant="outline">Beta</Badge>
 * ```
 */
export default function Badge({
  variant = 'default',
  children,
  className,
}: {
  /** Visual variant. @values default, secondary, outline @default 'default' */
  variant?: 'default' | 'secondary' | 'outline'
  /** Pill text. */
  children?: React.ReactNode
  /** Additional classes appended to `my-badge`. */
  className?: string
}) {
  return (
    <span
      data-variant={variant}
      className={className ? `my-badge ${className}` : 'my-badge'}
    >
      {children}
    </span>
  )
}
