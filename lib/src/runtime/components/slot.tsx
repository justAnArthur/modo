// theme/density/radius switcher wrapper. when the user provides a
// `Select` via modo.config.ts components.Select, use it; otherwise
// fall back to native <select>. the user's component is expected to
// accept { value, onValueChange, options }; the native fallback
// adapts the onChange signature so the consumer doesn't care.

import type { ChangeEvent } from 'react'
import { Select as UserSelect } from 'virtual:modo-components'

interface SelectSlotProps {
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
}

export function SelectSlot({ value, onChange, options }: SelectSlotProps) {
  if (UserSelect) {
    return <UserSelect value={value} onValueChange={onChange} options={options} />
  }
  return (
    <select
      data-aui="control-input"
      value={value}
      onChange={(e: ChangeEvent<HTMLSelectElement>) => onChange(e.target.value)}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  )
}
