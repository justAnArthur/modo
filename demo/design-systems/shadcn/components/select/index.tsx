import {
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
  Select as ShadcnSelect,
} from './select'

/**
 * shadcn/ui Select — single-choice dropdown backed by Radix.
 * Pulled via `bunx shadcn@latest add select` (radix-nova style, neutral base color).
 * This adapter implements modo's Select shell contract (value / onValueChange /
 * options), so the docs chrome and demo switcher render with it.
 *
 * @example {@include ./examples.mdx}
 */
export default function Select({
  value,
  defaultValue,
  onValueChange,
  options,
  placeholder = 'Select an option',
  size = 'default',
}: {
  /** Selected value when controlled. */
  value?: string
  /** Initially selected value when uncontrolled. */
  defaultValue?: string
  /** Called with the newly selected value. */
  onValueChange?: (value: string) => void
  /** Options to choose from; a `group` lists an option under that label, after the ungrouped ones. */
  options: { value: string; label: string; group?: string }[]
  /** Placeholder shown while no value is selected. @default 'Select an option' */
  placeholder?: string
  /** Trigger height. @values default, sm */
  size?: 'default' | 'sm'
}) {
  const item = (option: { value: string; label: string }) => (
    <SelectItem key={option.value} value={option.value}>
      {option.label}
    </SelectItem>
  )
  const groups = [...new Set(options.flatMap(option => option.group ?? []))]
  return (
    <ShadcnSelect value={value} defaultValue={defaultValue} onValueChange={onValueChange}>
      <SelectTrigger size={size}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.filter(option => option.group === undefined).map(item)}
        {groups.map(group => (
          <SelectGroup key={group}>
            <SelectLabel>{group}</SelectLabel>
            {options.filter(option => option.group === group).map(item)}
          </SelectGroup>
        ))}
      </SelectContent>
    </ShadcnSelect>
  )
}
