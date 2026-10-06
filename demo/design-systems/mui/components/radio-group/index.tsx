import FormControl from '@mui/material/FormControl'
import FormControlLabel from '@mui/material/FormControlLabel'
import FormLabel from '@mui/material/FormLabel'
import Radio from '@mui/material/Radio'
import MuiRadioGroup from '@mui/material/RadioGroup'
import { useId } from 'react'
import { MuiProvider } from '../../theme'

/**
 * Exclusive choice between named options. Modo contract over MUI: RadioGroup
 * plus FormControlLabel-wrapped Radios generated from `options`; pass
 * children instead for full control.
 *
 * @example {@include ./examples.mdx}
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
  const id = useId()
  const group = (
    <MuiRadioGroup aria-labelledby={label && id} defaultValue={defaultValue} row={row}>
      {children ??
        (options ?? []).map(option => (
          <FormControlLabel key={option.value} value={option.value} control={<Radio />} label={option.label} />
        ))}
    </MuiRadioGroup>
  )
  return (
    <MuiProvider>
      {label ? (
        <FormControl>
          <FormLabel id={id}>{label}</FormLabel>
          {group}
        </FormControl>
      ) : (
        group
      )}
    </MuiProvider>
  )
}
