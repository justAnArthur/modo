import type { OtherProps } from 'other-lib'
import { type ButtonHTMLAttributes, forwardRef, type ReactNode } from 'react'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, OtherProps {
  /** Visual style. @default 'solid' */
  variant?: 'solid' | 'ghost'
  /** Shows a spinner and blocks presses. */
  loading?: boolean
  /** Button content. */
  children?: ReactNode
}

/**
 * A button from the base design system.
 *
 * It presses.
 *
 * @example {@include ./examples.mdx}
 */
const Button = forwardRef<HTMLButtonElement, ButtonProps>(({ variant = 'solid', loading, ...props }, ref) => (
  <button ref={ref} type="button" data-variant={variant} disabled={loading} {...props} />
))

export { Button }
export default Button
