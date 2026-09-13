import type { ReactNode, MouseEventHandler } from 'react'
import './button.css'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive'
export type ButtonSize = 'sm' | 'md' | 'lg'

export default function Button({ children, variant = 'primary', size = 'md', disabled, onClick, className, type = 'button', ...rest }: {
  children?: ReactNode
  variant?: ButtonVariant
  size?: ButtonSize
  disabled?: boolean
  onClick?: MouseEventHandler<HTMLButtonElement>
  className?: string
  type?: 'button' | 'submit' | 'reset'
  [key: string]: unknown
}) {
  const cls = ['shell-button', className].filter(Boolean).join(' ')
  return (
    <button
      type={type}
      data-aui="shell-button"
      data-variant={variant}
      data-size={size}
      disabled={disabled}
      onClick={onClick}
      className={cls}
      {...rest}
    >
      {children}
    </button>
  )
}
