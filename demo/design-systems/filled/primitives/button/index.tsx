import './button.css'

/**
 * Triggers an action.
 *
 * @example {@include ./examples.mdx}
 */
export default function Button({
  variant = 'primary',
  disabled,
  onClick,
  children,
}: {
  /** Visual style. @values primary, secondary @default 'primary' */
  variant?: 'primary' | 'secondary'
  /** Whether the button is disabled. @default false */
  disabled?: boolean
  /** Click handler. */
  onClick?: () => void
  /** Element contents. */
  children?: React.ReactNode
}) {
  return (
    <button
      data-variant={variant}
      className="my-btn"
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  )
}
