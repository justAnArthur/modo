/**
 * Triggers an action or event.
 *
 * @example
 * # Primary
 *
 * The main call to action.
 *
 * ```tsx
 * <Button variant="primary">Save</Button>
 * ```
 *
 * @example
 * # Secondary
 *
 * Use for non-destructive actions.
 *
 * ```tsx
 * <Button variant="secondary">Cancel</Button>
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
  children,
}: {
  /** Visual style. @values primary, secondary, ghost */
  variant?: 'primary' | 'secondary' | 'ghost'
  /** Size. @values sm, md, lg */
  size?: 'sm' | 'md' | 'lg'
  /** Whether the button is disabled. @default false */
  disabled?: boolean
  children?: React.ReactNode
}) {
  return (
    <button data-variant={variant} data-size={size} disabled={disabled} className="modo-button">
      {children}
    </button>
  )
}
