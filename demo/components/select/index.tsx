/**
 * A native-styled select for the lib chrome. Replace with a real one in
 * your project. The lib's `+Layout.tsx` consumes this via the
 * `components: { Select }` field in `modo.config.ts`.
 *
 * @example
 * # Theme
 *
 * ```tsx
 * <Select
 *   value="system"
 *   onValueChange={() => {}}
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
  onValueChange,
  options,
}: {
  /** Currently selected option value. */
  value: string
  /** Called with the new value when the user picks a different option. */
  onValueChange: (value: string) => void
  /** Array of { value, label } pairs. */
  options: { value: string; label: string }[]
}) {
  return (
    <span data-component="user-select" data-aui="user-select">
      <select
        data-aui="user-select-inner"
        value={value}
        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onValueChange(e.target.value)}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <span data-aui="user-select-badge">user</span>
    </span>
  )
}
