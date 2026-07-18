// a minimal user-provided <Select> for the lib's "make it yours" panel.
// default export — the componentsPlugin picks up default exports
// with the matching name (or named exports).

import { define } from 'modo-atomic-ui/define'

export const meta = define({
  name: 'Select',
  description: 'A native-styled select for the lib chrome. Replace with a real one in your project.',
  category: 'components',
})

interface SelectProps {
  value: string
  onValueChange: (value: string) => void
  options: { value: string; label: string }[]
}

export default function Select({ value, onValueChange, options }: SelectProps) {
  return (
    <span data-component="user-select" data-aui="user-select">
      <select
        data-aui="user-select-inner"
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <span data-aui="user-select-badge">user</span>
    </span>
  )
}

export const examples = [
  {
    name: 'Theme',
    props: {
      value: 'system',
      onValueChange: () => {},
      options: [
        { value: 'system', label: 'system' },
        { value: 'light', label: 'light' },
        { value: 'dark', label: 'dark' },
      ],
    },
  },
] as const

export const props = [
  { name: 'value', type: 'string', description: 'currently selected option value' },
  { name: 'onValueChange', type: 'string', description: 'called with the new value when the user picks a different option' },
  { name: 'options', type: 'string', description: 'array of { value, label } pairs' },
] as const
