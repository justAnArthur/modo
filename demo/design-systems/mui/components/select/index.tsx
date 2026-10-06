import MenuItem from '@mui/material/MenuItem'
import TextField from '@mui/material/TextField'
import { MuiProvider } from '../../theme'

/**
 * Single-option picker. Modo contract over MUI: a `TextField select` fed
 * from the `options` prop, with `onChange` adapted to modo's
 * `(value: string) => void`. The docs chrome and the demo switcher render
 * with this component, controlled; examples pass `defaultValue` instead,
 * since modo examples carry no hooks.
 *
 * @example {@include ./examples.mdx}
 */
export default function Select({
  value,
  defaultValue,
  onChange,
  options,
  label,
  size,
  disabled,
}: {
  /** Currently selected value (controlled). */
  value?: string
  /** Initially selected value (uncontrolled). */
  defaultValue?: string
  /** Called with the newly selected option value. */
  onChange?: (value: string) => void
  /** Options to pick from. */
  options: { value: string; label: string }[]
  /** Floating label shown above the field. */
  label?: string
  /** Size of the field. */
  size?: 'small' | 'medium'
  /** Whether the select is disabled. @default false */
  disabled?: boolean
}) {
  return (
    <MuiProvider>
      <TextField
        select
        value={value}
        defaultValue={defaultValue}
        onChange={event => onChange?.(event.target.value)}
        label={label}
        size={size}
        disabled={disabled}
        sx={{ minWidth: 160 }}
      >
        {options.map(option => (
          <MenuItem key={option.value} value={option.value}>
            {option.label}
          </MenuItem>
        ))}
      </TextField>
    </MuiProvider>
  )
}
