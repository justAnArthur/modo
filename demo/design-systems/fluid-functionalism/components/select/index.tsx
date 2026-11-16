import { Select as FluidSelect, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger } from './select'

/**
 * Fluid Functionalism Select — single-choice dropdown with spring-animated
 * popup on an Elevated surface, fluid hover highlight that glides between
 * options, and a selection-acknowledged close (the checkmark draws before
 * the menu exits). Pulled via `bunx shadcn@latest add @fluid/select`.
 * This adapter implements modo's Select shell contract (value / onValueChange /
 * options), so the docs chrome and demo switcher render with it.
 *
 * @example {@include ./examples.mdx}
 */
export default function Select({
  value,
  onValueChange,
  options,
  placeholder = 'Select…',
  size = 'default',
}: {
  /** Currently selected value. */
  value: string
  /** Called with the newly selected value. */
  onValueChange: (value: string) => void
  /** Options to choose from; a `group` lists an option under that label, after the ungrouped ones. */
  options: { value: string; label: string; group?: string }[]
  /** Placeholder shown while no value is selected. @default 'Select…' */
  placeholder?: string
  /** Trigger and popup height step; sm maps to the compact ladder step. @values default, sm */
  size?: 'default' | 'sm'
}) {
  const groups = [...new Set(options.flatMap(option => option.group ?? []))]
  const ungrouped = options.filter(option => option.group === undefined)
  // Rows are indexed in render order, which groups reorder: the fluid hover follows the index.
  const ordered = [ungrouped, ...groups.map(group => options.filter(option => option.group === group))]
  const rows = ordered.flat()
  const item = (option: { value: string; label: string }) => (
    <SelectItem key={option.value} value={option.value} index={rows.indexOf(option)}>
      {option.label}
    </SelectItem>
  )
  return (
    <FluidSelect value={value} onValueChange={onValueChange} size={size === 'sm' ? 'compact' : 'default'}>
      <SelectTrigger placeholder={placeholder} />
      <SelectContent>
        {ungrouped.map(item)}
        {groups.map((group, i) => (
          <SelectGroup key={group}>
            <SelectLabel>{group}</SelectLabel>
            {ordered[i + 1]!.map(item)}
          </SelectGroup>
        ))}
      </SelectContent>
    </FluidSelect>
  )
}
