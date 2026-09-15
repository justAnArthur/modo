import './button.css'

/**
 * Triggers an action or event. Shadcn-matching interface — four variants,
 * four sizes, hover lifts, active presses.
 *
 * @example
 * # Primary
 *
 * The main call to action.
 *
 * ```tsx
 * <Button>Save</Button>
 * ```
 *
 * @example
 * # Secondary
 *
 * Use for non-destructive supporting actions.
 *
 * ```tsx
 * <Button variant="secondary">Cancel</Button>
 * ```
 *
 * @example
 * # Outline
 *
 * Bordered, transparent background. Reads as tertiary.
 *
 * ```tsx
 * <Button variant="outline">Learn more</Button>
 * ```
 *
 * @example
 * # Ghost
 *
 * Use for the least-emphasized action.
 *
 * ```tsx
 * <Button variant="ghost">Skip</Button>
 * ```
 *
 * @example
 * # Sizes
 *
 * Three text-button sizes — `sm` (28px), `md` (32px), `lg` (40px).
 *
 * ```tsx
 * <Button size="sm">Small</Button>
 * <Button size="md">Medium</Button>
 * <Button size="lg">Large</Button>
 * ```
 *
 * @example
 * # Icon
 *
 * Square 32×32 button for icon-only actions.
 *
 * ```tsx
 * <Button size="icon" aria-label="Delete">×</Button>
 * ```
 *
 * @example
 * # Disabled
 *
 * ```tsx
 * <Button disabled>Save</Button>
 * ```
 */
export default function Button({
  variant = 'primary',
  size = 'md',
  disabled,
  onClick,
  className,
  children,
  ...rest
}: {
  /** Visual style. @values primary, secondary, outline, ghost @default 'primary' */
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost'
  /** Size. @values sm, md, lg, icon @default 'md' */
  size?: 'sm' | 'md' | 'lg' | 'icon'
  /** Whether the button is disabled. @default false */
  disabled?: boolean
  /** Click handler. */
  onClick?: () => void
  /** Additional classes appended to `my-btn`. */
  className?: string
  /** Element contents. */
  children?: React.ReactNode
  /** Catch-all for `aria-*`, `data-*`, etc. — not shown in the prop table. */
  [key: string]: unknown
}) {
  return (
    <button
      data-variant={variant}
      data-size={size}
      data-modo="shell-button"
      disabled={disabled}
      onClick={onClick}
      className={className ? `my-btn ${className}` : 'my-btn'}
      {...rest}
    >
      {children}
    </button>
  )
}
