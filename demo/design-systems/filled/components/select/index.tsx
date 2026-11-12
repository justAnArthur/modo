/**
 * Picks one option from a list. A native `<select>` in filled's plain style:
 * the browser keeps the menu, the keyboard and the mobile picker. Also the
 * docs chrome's Select, which the demo switcher renders.
 *
 * @example {@include ./examples.mdx}
 */
export default function Select({
  value,
  defaultValue,
  onChange,
  options,
  disabled,
  'aria-label': ariaLabel,
}: {
  /** The selected value (controlled). */
  value?: string
  /** The initially selected value (uncontrolled). */
  defaultValue?: string
  /** Called with the newly selected value. */
  onChange?: (value: string) => void
  /** The options to pick from. */
  options: { value: string; label: string }[]
  /** Whether the select is disabled. @default false */
  disabled?: boolean
  'aria-label'?: string
}) {
  return (
    <select
      className="my-select"
      value={value}
      defaultValue={defaultValue}
      onChange={event => onChange?.(event.target.value)}
      disabled={disabled}
      aria-label={ariaLabel}
    >
      {options.map(option => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  )
}
