import MuiButton from '@mui/material/Button'
import { MuiProvider } from '../../theme'

/**
 * Triggers an action. Thin modo adapter over MUI's Button. Also the docs
 * chrome's Button: the chrome renders its copy and show-code controls with
 * `variant="ghost"` (MUI's `text`), `size="icon-sm"` (MUI's `small`),
 * `aria-label` and `aria-pressed`.
 *
 * @example {@include ./examples.mdx}
 */
export default function Button({
  variant = 'contained',
  color,
  size = 'medium',
  disabled,
  onClick,
  children,
  ...aria
}: {
  /** Visual style. `ghost` is the chrome's name for `text`. @default 'contained' */
  variant?: 'contained' | 'text' | 'outlined' | 'ghost'
  /** Palette color of the button. @default 'primary' */
  color?: 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' | 'inherit'
  /** Size. `icon-sm` is the chrome's icon button, rendered `small`. @default 'medium' */
  size?: 'small' | 'medium' | 'large' | 'icon-sm'
  /** Whether the button is disabled. @default false */
  disabled?: boolean
  /** Click handler. */
  onClick?: () => void
  /** Button label. */
  children?: React.ReactNode
  'aria-label'?: string
  'aria-pressed'?: boolean
}) {
  return (
    <MuiProvider>
      <MuiButton
        variant={variant === 'ghost' ? 'text' : variant}
        color={color}
        size={size === 'icon-sm' ? 'small' : size}
        disabled={disabled}
        onClick={onClick}
        {...aria}
      >
        {children}
      </MuiButton>
    </MuiProvider>
  )
}
