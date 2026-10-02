/*
 * modo shell adapter — not a documented item.
 *
 * modo's docs chrome renders its Select slot with a flat
 * `value` / `onChange` / `options` contract (lib/src/lib/slots.tsx), while the
 * ported Fluid Functionalism Select is compositional (Select.Trigger /
 * Select.Content / Select.Item). This maps one onto the other so the chrome
 * runs on the design system's own Select; `components/select` keeps the
 * upstream API untouched.
 */

import { Select as FluidSelect, SelectContent, SelectItem, SelectTrigger } from '../components/select'

export default function Select({
  value,
  onChange,
  options,
  placeholder = 'Select…',
  size = 'default',
}: {
  /** Currently selected value. */
  value: string
  /** Called with the newly selected value. */
  onChange: (value: string) => void
  /** Options to choose from. */
  options: { value: string; label: string }[]
  /** Placeholder shown while nothing is selected. */
  placeholder?: string
  /** Ladder step for the trigger and popup; `sm` maps to the compact step. */
  size?: 'default' | 'sm' | 'compact'
}) {
  return (
    <FluidSelect value={value} onValueChange={onChange} size={size === 'default' ? 'default' : 'compact'}>
      <SelectTrigger placeholder={placeholder} />
      <SelectContent>
        {options.map((option, index) => (
          <SelectItem key={option.value} value={option.value} index={index}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </FluidSelect>
  )
}
