import './select.css'

/**
 * Native `<select>` with custom styling. Controlled.
 *
 * @example
 * # Default
 *
 * ```tsx
 * <Select
 *   value="system"
 *   onChange={(v) => console.log(v)}
 *   options={[
 *     { value: 'system', label: 'system' },
 *     { value: 'light', label: 'light' },
 *     { value: 'dark', label: 'dark' },
 *   ]}
 * />
 * ```
 */
export default function Select({
  value,
  onChange,
  options,
  className,
}: {
  /** Currently selected option value. */
  value: string
  /** Called with the new value when the user picks an option. */
  onChange: (value: string) => void
  /** Array of `{ value, label }` pairs. */
  options: { value: string; label: string }[]
  /** Additional classes appended to `my-select`. */
  className?: string
}) {
  return (
    <select
      value={value}
      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onChange(e.target.value)}
      className={className ? `my-select ${className}` : 'my-select'}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  )
}
