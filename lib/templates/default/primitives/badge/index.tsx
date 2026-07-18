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
 * # Solid
 *
 * High-emphasis variant. Use sparingly.
 *
 * ```tsx
 * <Badge tone="success" variant="solid">Live</Badge>
 * ```
 */
export default function Badge({
  tone = 'neutral',
  variant = 'soft',
  size = 'sm',
  children,
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
