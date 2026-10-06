import { useId } from 'react'
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
  defaultValue,
  onChange,
  disabled = false,
}: {
  /** Radio options to render, in order. */
  options: { value: string; label: string }[]
  /** Selected value when controlled. */
  value?: string
  /** Initially selected value when uncontrolled. */
  defaultValue?: string
  /** Called with the newly selected value. */
  onChange?: (value: string) => void
  /** Disables every radio in the group. */
  disabled?: boolean
}) {
  const id = useId()
  return (
    <ShadcnRadioGroup value={value} defaultValue={defaultValue} onValueChange={onChange} disabled={disabled}>
      {options.map(option => (
        <div key={option.value} className="flex items-center gap-2 text-sm">
          <RadioGroupItem value={option.value} id={`${id}-${option.value}`} />
          <label htmlFor={`${id}-${option.value}`}>{option.label}</label>
        </div>
      ))}
    </ShadcnRadioGroup>
  )
}
