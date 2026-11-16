import ListSubheader from '@mui/material/ListSubheader'
import MenuItem from '@mui/material/MenuItem'
import TextField from '@mui/material/TextField'
import { MuiProvider } from '../../theme'

/**
 * Single-option picker. Modo contract over MUI: a `TextField select` fed
 * from the `options` prop, with its `onChange` event adapted to modo's
 * `onValueChange(value)`. The docs chrome and the demo switcher render
 * with this component, controlled; examples pass `defaultValue` instead,
 * since modo examples carry no hooks.
 *
 * @example {@include ./examples.mdx}
 */
export default function Select({
  value,
  defaultValue,
  onValueChange,
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
  onValueChange?: (value: string) => void
  /** Options to pick from; a `group` lists an option under a subheader of that label, after the ungrouped ones. */
  options: { value: string; label: string; group?: string }[]
  /** Floating label shown above the field. */
  label?: string
  /** Size of the field. */
  size?: 'small' | 'medium'
  /** Whether the select is disabled. @default false */
  disabled?: boolean
}) {
  const item = (option: { value: string; label: string }) => (
    <MenuItem key={option.value} value={option.value}>
      {option.label}
    </MenuItem>
  )
  const groups = [...new Set(options.flatMap(option => option.group ?? []))]
  return (
    <MuiProvider>
      <TextField
        select
        value={value}
        defaultValue={defaultValue}
        onChange={event => onValueChange?.(event.target.value)}
        label={label}
        size={size}
        disabled={disabled}
        sx={{ minWidth: 160 }}
      >
        {options.filter(option => option.group === undefined).map(item)}
        {/* MUI's Select reads its direct children: subheaders and rows in one flat list, no wrappers. */}
        {groups.flatMap(group => [
          <ListSubheader key={`group:${group}`}>{group}</ListSubheader>,
          ...options.filter(option => option.group === group).map(item),
        ])}
      </TextField>
    </MuiProvider>
  )
}
