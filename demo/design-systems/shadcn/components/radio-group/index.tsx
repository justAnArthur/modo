import { RadioGroup as ShadcnRadioGroup, RadioGroupItem } from './radio-group'

/**
 * shadcn/ui RadioGroup — single-choice control backed by Radix.
 * Pulled via `bunx shadcn@latest add radio-group` (radix-nova style, neutral base color).
 *
 * @example # Basic
 * ```tsx
 * <RadioGroup value="standard" options={[
 *   { value: 'standard', label: 'Standard' },
 *   { value: 'priority', label: 'Priority' },
 *   { value: 'express', label: 'Express' },
 * ]} />
 * ```
 *
 * @example # Disabled
 * ```tsx
 * <RadioGroup value="standard" disabled options={[
 *   { value: 'standard', label: 'Standard (only option)' },
 *   { value: 'express', label: 'Express' },
 * ]} />
 * ```
 */
export default function RadioGroup({ options, value, onChange, disabled = false }: {
  /** Radio options to render, in order. */
  options: { value: string; label: string }[]
  /** Currently selected value. */
  value?: string
  /** Called with the newly selected value. */
  onChange?: (value: string) => void
  /** Disables every radio in the group. */
  disabled?: boolean
}) {
  return (
    <ShadcnRadioGroup value={value} onValueChange={onChange} disabled={disabled}>
      {options.map((option) => (
        <label key={option.value} className="flex items-center gap-2 text-sm">
          <RadioGroupItem value={option.value} />
          {option.label}
        </label>
      ))}
    </ShadcnRadioGroup>
  )
}
