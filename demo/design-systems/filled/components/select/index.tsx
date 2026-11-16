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
  onValueChange,
  options,
  disabled,
  'aria-label': ariaLabel,
}: {
  /** The selected value (controlled). */
  value?: string
  /** The initially selected value (uncontrolled). */
  defaultValue?: string
  /** Called with the newly selected value. */
  onValueChange?: (value: string) => void
  /** The options to pick from; a `group` lists an option under an `<optgroup>` of that label, after the ungrouped ones. */
  options: { value: string; label: string; group?: string }[]
  /** Whether the select is disabled. @default false */
  disabled?: boolean
  'aria-label'?: string
}) {
  const option = (o: { value: string; label: string }) => (
    <option key={o.value} value={o.value}>
      {o.label}
    </option>
  )
  const groups = [...new Set(options.flatMap(o => o.group ?? []))]
  return (
    <select
      className="my-select"
      value={value}
      defaultValue={defaultValue}
      onChange={event => onValueChange?.(event.target.value)}
      disabled={disabled}
      aria-label={ariaLabel}
    >
      {options.filter(o => o.group === undefined).map(option)}
      {groups.map(group => (
        <optgroup key={group} label={group}>
          {options.filter(o => o.group === group).map(option)}
        </optgroup>
      ))}
    </select>
  )
}
