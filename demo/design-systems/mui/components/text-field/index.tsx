import MuiTextField from '@mui/material/TextField'
import { MuiProvider } from '../../theme'

/**
 * Text input with label and helper text. Thin modo adapter over MUI's
 * TextField; examples use `defaultValue` since modo examples carry no hooks.
 *
 * @example {@include ./examples.mdx}
 */
export default function TextField({
  label,
  placeholder,
  defaultValue,
  type = 'text',
  helperText,
  multiline,
  rows,
  size,
  disabled,
}: {
  /** Floating label shown above the field. */
  label?: string
  /** Placeholder shown when empty. */
  placeholder?: string
  /** Initial text (examples are static, so uncontrolled). */
  defaultValue?: string
  /** Input type. @default 'text' */
  type?: string
  /** Helper text shown below the field. */
  helperText?: string
  /** Render a textarea instead of a single-line input. */
  multiline?: boolean
  /** Rows to show when multiline. */
  rows?: number
  /** Size of the field. */
  size?: 'small' | 'medium'
  /** Whether the field is disabled. @default false */
  disabled?: boolean
}) {
  return (
    <MuiProvider>
      <MuiTextField
        label={label}
        placeholder={placeholder}
        defaultValue={defaultValue}
        type={type}
        helperText={helperText}
        multiline={multiline}
        rows={rows}
        size={size}
        disabled={disabled}
      />
    </MuiProvider>
  )
}
