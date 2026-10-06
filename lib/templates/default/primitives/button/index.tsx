import type { MouseEventHandler, ReactNode } from 'react'

/**
 * Button — triggers an action. Also the docs chrome's Button: the chrome
 * passes `variant="ghost"`, `aria-label` and `aria-pressed`.
 *
 * @example {@include ./examples.mdx}
 */
export default function Button({
  variant = 'primary',
  disabled,
  onClick,
  className,
  children,
  ...aria
}: {
  /** Visual style. */
  variant?: 'primary' | 'secondary' | 'ghost'
  /** Disables interaction. */
  disabled?: boolean
  /** Click handler. */
  onClick?: MouseEventHandler<HTMLButtonElement>
  /** Extra classes on the button. */
  className?: string
  /** Button content. */
  children?: ReactNode
  'aria-label'?: string
  'aria-pressed'?: boolean
}) {
  return (
    <button type="button" data-variant={variant} disabled={disabled} onClick={onClick} className={className} {...aria}>
      {children}
    </button>
  )
}
