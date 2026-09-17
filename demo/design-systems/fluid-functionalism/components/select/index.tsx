import { Select as FluidSelect, SelectContent, SelectItem, SelectTrigger } from './select'

/**
 * Fluid Functionalism Select — single-choice dropdown with spring-animated
 * popup on an Elevated surface, fluid hover highlight that glides between
 * options, and a selection-acknowledged close (the checkmark draws before
 * the menu exits). Pulled via `bunx shadcn@latest add @fluid/select`.
 * This adapter implements modo's Select shell contract (value / onChange /
 * options), so the docs chrome and demo switcher render with it.
 *
 * @example # Basic
 * ```tsx
 * <Select value="fast" options={[
 *   { value: 'fast', label: 'Fast — 80ms' },
 *   { value: 'moderate', label: 'Moderate — 160ms' },
 *   { value: 'slow', label: 'Slow — 240ms' },
 * ]} />
 * ```
 *
 * @example # Compact trigger
 * The compact step (28px) fits dense chrome like toolbars and sidebars.
 *
 * ```tsx
 * <Select size="sm" value="light" options={[
 *   { value: 'light', label: 'Light' },
 *   { value: 'dark', label: 'Dark' },
 *   { value: 'system', label: 'System' },
 * ]} />
 * ```
 */
export default function Select({ value, onChange, options, placeholder = 'Select…', size = 'default' }: {
  /** Currently selected value. */
  value: string
  /** Called with the newly selected value. */
  onChange: (value: string) => void
  /** Options to choose from. */
  options: { value: string; label: string }[]
  /** Placeholder shown while no value is selected. @default 'Select…' */
  placeholder?: string
  /** Trigger and popup height step; sm maps to the compact ladder step. @values default, sm */
  size?: 'default' | 'sm'
}) {
  return (
    <FluidSelect value={value} onValueChange={onChange} size={size === 'sm' ? 'compact' : 'default'}>
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
