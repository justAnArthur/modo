import {
  Select as ShadcnSelect,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './select'

/**
 * shadcn/ui Select — single-choice dropdown backed by Radix.
 * Pulled via `bunx shadcn@latest add select` (radix-nova style, neutral base color).
 * This adapter implements modo's Select shell contract (value / onChange /
 * options), so the docs chrome and demo switcher render with it.
 *
 * @example # Basic
 * ```tsx
 * <Select value="neutral" options={[
 *   { value: 'neutral', label: 'Neutral' },
 *   { value: 'gray', label: 'Gray' },
 *   { value: 'zinc', label: 'Zinc' },
 *   { value: 'stone', label: 'Stone' },
 * ]} />
 * ```
 *
 * @example # Small trigger
 * The sm trigger fits dense chrome like toolbars and sidebars.
 *
 * ```tsx
 * <Select size="sm" value="light" options={[
 *   { value: 'light', label: 'Light' },
 *   { value: 'dark', label: 'Dark' },
 *   { value: 'system', label: 'System' },
 * ]} />
 * ```
 */
export default function Select({ value, onChange, options, placeholder = 'Select an option', size = 'default' }: {
  /** Currently selected value. */
  value: string
  /** Called with the newly selected value. */
  onChange: (value: string) => void
  /** Options to choose from. */
  options: { value: string; label: string }[]
  /** Placeholder shown while no value is selected. @default 'Select an option' */
  placeholder?: string
  /** Trigger height. @values default, sm */
  size?: 'default' | 'sm'
}) {
  return (
    <ShadcnSelect value={value} onValueChange={onChange}>
      <SelectTrigger size={size}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </ShadcnSelect>
  )
}
