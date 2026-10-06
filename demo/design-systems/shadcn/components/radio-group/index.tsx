// biome-ignore-all lint: vendored upstream code keeps its own patterns (see the header)
import { RadioGroupItem, RadioGroup as ShadcnRadioGroup } from './radio-group'

/**
 * shadcn/ui RadioGroup — single-choice control backed by Radix.
 * Pulled via `bunx shadcn@latest add radio-group` (radix-nova style, neutral base color).
 *
 * @example {@include ./examples.mdx}
 */
export default function RadioGroup({
  options,
  value,
  onChange,
  disabled = false,
}: {
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
      {options.map(option => (
        <label key={option.value} className="flex items-center gap-2 text-sm">
          <RadioGroupItem value={option.value} />
          {option.label}
        </label>
      ))}
    </ShadcnRadioGroup>
  )
}
