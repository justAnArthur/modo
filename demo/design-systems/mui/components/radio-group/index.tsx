import { MuiProvider } from '../../theme'
import FormControl from '@mui/material/FormControl'
import FormLabel from '@mui/material/FormLabel'
import MuiRadioGroup from '@mui/material/RadioGroup'
import FormControlLabel from '@mui/material/FormControlLabel'
import Radio from '@mui/material/Radio'

/**
 * Exclusive choice between named options. Modo contract over MUI: RadioGroup
 * plus FormControlLabel-wrapped Radios generated from `options`; pass
 * children instead for full control.
 *
 * @example
 * # Stack
 *
 * ```tsx
 * <RadioGroup
 *   defaultValue="dark"
 *   options={[
 *     { value: 'light', label: 'Light' },
 *     { value: 'dark', label: 'Dark' },
 *     { value: 'system', label: 'System' },
 *   ]}
 * />
 * ```
 *
 * @example
 * # Row with label
 *
 * ```tsx
 * <RadioGroup
 *   label="Density"
 *   row
 *   defaultValue="comfortable"
 *   options={[
 *     { value: 'compact', label: 'Compact' },
 *     { value: 'comfortable', label: 'Comfortable' },
 *   ]}
 * />
 * ```
 */
export default function RadioGroup({
  options,
  defaultValue,
  label,
  row,
  children,
}: {
  /** Radios to generate, as value/label pairs. */
  options?: { value: string; label: string }[]
  /** Initially selected value. */
  defaultValue?: string
  /** Group label rendered above the radios. */
  label?: string
  /** Lay the radios out horizontally. @default false */
  row?: boolean
  /** Custom radio children; takes precedence over `options`. */
  children?: React.ReactNode
}) {
  const group = (
    <MuiRadioGroup defaultValue={defaultValue} row={row}>
      {children ??
        (options ?? []).map((option) => (
          <FormControlLabel
            key={option.value}
            value={option.value}
            control={<Radio />}
            label={option.label}
          />
        ))}
    </MuiRadioGroup>
  )
  return (
    <MuiProvider>
      {label ? (
        <FormControl>
          <FormLabel id="modo-radio-group-label">{label}</FormLabel>
          {group}
        </FormControl>
      ) : (
        group
      )}
    </MuiProvider>
  )
}
