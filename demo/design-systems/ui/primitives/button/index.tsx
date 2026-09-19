import './button.css'
import type { ReactNode } from 'react'

/**
 * A minimal UI button.
 *
 * @example
 * ```tsx
 * <Button variant="primary">Click me</Button>
 * ```
 */
export default function Button({
  variant = 'primary',
  disabled,
  onClick,
  children,
}: {
  variant?: 'primary' | 'secondary' | 'tertiary'
  disabled?: boolean
  onClick?: () => void
  children: ReactNode
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
