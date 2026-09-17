import { MuiProvider } from '../../theme'
import MuiButton from '@mui/material/Button'

/**
 * Triggers an action. Thin modo adapter over MUI's Button; the docs chrome
 * inherits it for example cards, so it also accepts modo's `ghost` variant
 * and short sizes, normalizing them to the nearest MUI equivalents.
 *
 * @example
 * # Contained
 *
 * ```tsx
 * <Button>Save</Button>
 * ```
 *
 * @example
 * # Text
 *
 * ```tsx
 * <Button variant="text">Skip</Button>
 * ```
 *
 * @example
 * # Outlined
 *
 * ```tsx
 * <Button variant="outlined" color="secondary">Cancel</Button>
 * ```
 *
 * @example
 * # Sizes and disabled
 *
 * ```tsx
 * <Button size="small">Small</Button>
 * <Button size="large" color="error" disabled>Delete</Button>
 * ```
 */
export default function Button({
  variant = 'contained',
  color,
  size = 'medium',
  disabled,
  onClick,
  children,
}: {
  /** Visual style. `ghost` and `default` are modo-chrome aliases, normalized to `text` and `contained`. @values contained, text, outlined, ghost, default @default 'contained' */
  variant?: 'contained' | 'text' | 'outlined' | 'ghost' | 'default'
  /** Palette color of the button. @default 'primary' */
  color?: 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' | 'inherit'
  /** Size — MUI names, or the modo-chrome short forms. @default 'medium' */
  size?: 'small' | 'medium' | 'large' | 'sm' | 'md' | 'lg'
  /** Whether the button is disabled. @default false */
  disabled?: boolean
  /** Click handler. */
  onClick?: () => void
  /** Button label. */
  children?: React.ReactNode
}) {
  const muiVariant =
    variant === 'ghost' ? 'text' : variant === 'default' ? 'contained' : variant
  const muiSize =
    size === 'sm' ? 'small' : size === 'md' ? 'medium' : size === 'lg' ? 'large' : size
  return (
    <MuiProvider>
      <MuiButton
        variant={muiVariant}
        color={color}
        size={muiSize}
        disabled={disabled}
        onClick={onClick}
      >
        {children}
      </MuiButton>
    </MuiProvider>
  )
}
