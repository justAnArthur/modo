import { MuiProvider } from '../../theme'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'

/**
 * Single-option picker. Modo contract over MUI: a `TextField select` fed
 * from the `options` prop, with `onChange` adapted to modo's
 * `(value: string) => void`. The docs chrome and the demo switcher render
 * with this component.
 *
 * @example
 * # Framework
 *
 * ```tsx
 * <Select
 *   value="mui"
 *   options={[
 *     { value: 'filled', label: 'filled' },
 *     { value: 'shadcn', label: 'shadcn/ui' },
 *     { value: 'mui', label: 'MUI' },
 *   ]}
 *   onChange={() => {}}
 * />
 * ```
 *
 * @example
 * # With label
 *
 * ```tsx
 * <Select
 *   label="Density"
 *   value="comfortable"
 *   options={[
 *     { value: 'compact', label: 'Compact' },
 *     { value: 'comfortable', label: 'Comfortable' },
 *   ]}
 * />
 * ```
 */
export default function Select({
  value,
  onChange,
  options,
  label,
  size,
  disabled,
}: {
  /** Currently selected value. */
  value: string
  /** Called with the newly selected option value. */
  onChange: (value: string) => void
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
        onChange={(event) => onChange(event.target.value as string)}
        label={label}
        size={size}
        disabled={disabled}
        sx={{ minWidth: 160 }}
      >
        {options.map((option) => (
          <MenuItem key={option.value} value={option.value}>
            {option.label}
          </MenuItem>
        ))}
      </TextField>
    </MuiProvider>
  )
}
