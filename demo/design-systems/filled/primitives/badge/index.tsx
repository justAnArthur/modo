import './badge.css'

/**
 * Inline status pill.
 *
 * @example
 * # Default
 *
 * {@includeCode ./examples/default.tsx}
 *
 * @example
 * # Outline
 *
 * {@includeCode ./examples/outline.tsx}
 */
export default function Badge({
  variant = 'default',
  children,
}: {
  /** Visual style. @values default, outline @default 'default' */
  variant?: 'default' | 'outline'
  /** Pill text. */
  children?: React.ReactNode
}) {
  return (
    <span data-variant={variant} className="my-badge">
      {children}
    </span>
  )
}
