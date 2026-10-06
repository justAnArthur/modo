import { SelectContent, SelectItem, SelectTrigger, SelectValue, Select as ShadcnSelect } from './select'

/**
 * shadcn/ui Select — single-choice dropdown backed by Radix.
 * Pulled via `bunx shadcn@latest add select` (radix-nova style, neutral base color).
 * This adapter implements modo's Select shell contract (value / onChange /
 * options), so the docs chrome and demo switcher render with it.
 *
 * @example {@include ./examples.mdx}
 */
export default function Select({
  value,
  defaultValue,
  onChange,
  options,
  placeholder = 'Select an option',
  size = 'default',
}: {
  /** Selected value when controlled. */
  value?: string
  /** Initially selected value when uncontrolled. */
  defaultValue?: string
  /** Called with the newly selected value. */
  onChange?: (value: string) => void
  /** Options to choose from. */
  options: { value: string; label: string }[]
  /** Placeholder shown while no value is selected. @default 'Select an option' */
  placeholder?: string
  /** Trigger height. @values default, sm */
  size?: 'default' | 'sm'
}) {
  return (
    <ShadcnSelect value={value} defaultValue={defaultValue} onValueChange={onChange}>
      <SelectTrigger size={size}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map(option => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </ShadcnSelect>
  )
}
