import type { ReactNode, MouseEventHandler } from 'react'
import './button.css'

export interface ButtonProps {
  /** Visual variant. */
  variant?: 'primary' | 'secondary' | 'ghost'
  /** Size preset. */
  size?: 'sm' | 'md' | 'lg'
  /** Disable interaction. */
  disabled?: boolean
  /** Click handler. */
  onClick?: MouseEventHandler<HTMLButtonElement>
  /** Optional className. */
  className?: string
  /** Button content. */
  children?: ReactNode
}

export default function Button({
  variant = 'primary',
  size = 'md',
  disabled,
  onClick,
  className,
  children,
}: ButtonProps) {
  const cls = [className].filter(Boolean).join(' ')
  return (
    <button
      data-variant={variant}
      data-size={size}
      disabled={disabled}
      onClick={onClick}
      className={cls}
    >
      {children}
    </button>
  )
}
