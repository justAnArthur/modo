import './badge.css'

/**
 * Small status indicator or label.
 *
 * @example
 * # Neutral / Soft
 *
 * The default tone.
 *
 * ```tsx
 * <Badge tone="neutral">Draft</Badge>
 * ```
 *
 * @example
 * # Success / Soft
 *
 * ```tsx
 * <Badge tone="success">Published</Badge>
 * ```
 *
 * @example
 * # Warning / Soft
 *
 * ```tsx
 * <Badge tone="warning">Pending</Badge>
 * ```
 *
 * @example
 * # Danger / Soft
 *
 * ```tsx
 * <Badge tone="danger">Failed</Badge>
 * ```
 *
 * @example
 * # Info / Soft
 *
 * ```tsx
 * <Badge tone="info">Beta</Badge>
 * ```
 *
 * @example
 * # Solid
 *
 * High-emphasis variant. Use sparingly.
 *
 * ```tsx
 * <Badge tone="success" variant="solid">Live</Badge>
 * ```
 *
 * @example
 * # Outline
 *
 * Low-emphasis variant. Use in dense lists.
 *
 * ```tsx
 * <Badge tone="neutral" variant="outline">New</Badge>
 * ```
 */
export default function Badge(
  {
    tone = 'neutral',
    variant = 'soft',
    size = 'sm',
    children
  }: {
    /** Semantic tone. @values neutral, success, warning, danger, info */
    tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'info'
    /** Visual variant. @values solid, soft, outline */
    variant?: 'solid' | 'soft' | 'outline'
    /** Size. @values sm, md */
    size?: 'sm' | 'md'
    children?: React.ReactNode
  }) {
  return (
    <span data-tone={tone} data-variant={variant} data-size={size} className="modo-badge">
      {children}
    </span>
  )
}
