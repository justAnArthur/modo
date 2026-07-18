/**
 * Single-line text input.
 *
 * @example
 * # Default
 *
 * ```tsx
 * <Input placeholder="Type here…" />
 * ```
 *
 * @example
 * # Error
 *
 * ```tsx
 * <Input variant="error" placeholder="Invalid value" />
 * ```
 *
 * @example
 * # Disabled
 *
 * ```tsx
 * <Input disabled placeholder="Cannot edit" />
 * ```
 *
 * @example
 * # Small
 *
 * ```tsx
 * <Input size="sm" placeholder="Compact" />
 * ```
 *
 * @example
 * # Large
 *
 * ```tsx
 * <Input size="lg" placeholder="Roomy" />
 * ```
 */
export default function Input({
  variant = 'default',
  size = 'md',
  disabled,
  placeholder,
  value,
  onChange,
}: {
  /** Visual state. @values default, error */
  variant?: 'default' | 'error'
  /** Size. @values sm, md, lg */
  size?: 'sm' | 'md' | 'lg'
  /** Whether the input is disabled. @default false */
  disabled?: boolean
  /** Placeholder text. @default 'Type here…' */
  placeholder?: string
  value?: string
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
}) {
  return (
    <input
      data-variant={variant}
      data-size={size}
      disabled={disabled}
      placeholder={placeholder ?? 'Type here…'}
      value={value}
      onChange={onChange}
      className="modo-input"
    />
  )
}
