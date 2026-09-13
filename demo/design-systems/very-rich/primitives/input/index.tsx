import './input.css'

/**
 * Single-line text input. Standard controlled/uncontrolled usage.
 *
 * @example
 * # Default
 *
 * ```tsx
 * <Input placeholder="Type here…" />
 * ```
 *
 * @example
 * # Controlled
 *
 * ```tsx
 * <Input value="hello" onChange={() => {}} />
 * ```
 *
 * @example
 * # Disabled
 *
 * ```tsx
 * <Input disabled placeholder="Cannot edit" />
 * ```
 */
export default function Input({
  value,
  onChange,
  placeholder,
  disabled,
  className,
  ...rest
}: {
  /** Controlled value. */
  value?: string
  /** Change handler. */
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
  /** Placeholder text. */
  placeholder?: string
  /** Whether the input is disabled. @default false */
  disabled?: boolean
  /** Additional classes appended to `my-input`. */
  className?: string
  /** Catch-all for `type`, `aria-*`, etc. — not shown in the prop table. */
  [key: string]: unknown
}) {
  return (
    <input
      disabled={disabled}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      className={className ? `my-input ${className}` : 'my-input'}
      {...rest}
    />
  )
}
