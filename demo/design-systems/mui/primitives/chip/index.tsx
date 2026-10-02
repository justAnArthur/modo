import { MuiProvider } from '../../theme'
import MuiChip from '@mui/material/Chip'

/**
 * Compact tag for entities or filtering. Thin modo adapter over MUI's Chip.
 *
 * @example {@include ./examples.mdx}
 */
export default function Chip({
  label,
  variant = 'filled',
  color,
  size = 'medium',
  onDelete,
}: {
  /** Chip text. */
  label: string
  /** Visual style. @default 'filled' */
  variant?: 'filled' | 'outlined'
  /** Palette color of the chip. @default 'default' */
  color?: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'
  /** Size of the chip. @default 'medium' */
  size?: 'small' | 'medium'
  /** Shows a delete icon; called when it is clicked. */
  onDelete?: () => void
}) {
  return (
    <MuiProvider>
      <MuiChip label={label} variant={variant} color={color} size={size} onDelete={onDelete} />
    </MuiProvider>
  )
}
