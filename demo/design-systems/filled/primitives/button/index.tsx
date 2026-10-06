/**
 * Triggers an action. Also the docs chrome's Button: the chrome renders its
 * copy and show-code controls with `variant="ghost"`, `size="icon-sm"`,
 * `aria-label` and `aria-pressed`.
 *
 * @example {@include ./examples.mdx}
 */
export default function Button({
  variant = 'primary',
  size,
  disabled,
  onClick,
  children,
  ...aria
}: {
  /** Visual style. @values primary, secondary, ghost @default 'primary' */
  variant?: 'primary' | 'secondary' | 'ghost'
  /** `icon-sm` is the chrome's square icon button. */
  size?: 'icon-sm'
  /** Whether the button is disabled. @default false */
  disabled?: boolean
  /** Click handler. */
  onClick?: () => void
  /** Element contents. */
  children?: React.ReactNode
  'aria-label'?: string
  'aria-pressed'?: boolean
}) {
  return (
    <button
      type="button"
      data-variant={variant}
      data-size={size}
      className="my-btn"
      disabled={disabled}
      onClick={onClick}
      {...aria}
    >
      {children}
    </button>
  )
}
