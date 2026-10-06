import FormControlLabel from '@mui/material/FormControlLabel'
import MuiSwitch from '@mui/material/Switch'
import { MuiProvider } from '../../theme'

/**
 * Two-state toggle. Thin modo adapter over MUI's Switch; examples show
 * static states since modo examples carry no hooks.
 *
 * @example {@include ./examples.mdx}
 */
export default function Switch({
  checked = false,
  label,
  size,
  disabled,
}: {
  /** Whether the switch is on. @default false */
  checked?: boolean
  /** Optional label rendered beside the switch. */
  label?: string
  /** Size of the switch. @default 'medium' */
  size?: 'small' | 'medium'
  /** Whether the switch is disabled. @default false */
  disabled?: boolean
}) {
  const control = <MuiSwitch checked={checked} size={size} disabled={disabled} />
  return (
    <MuiProvider>{label !== undefined ? <FormControlLabel control={control} label={label} /> : control}</MuiProvider>
  )
}
