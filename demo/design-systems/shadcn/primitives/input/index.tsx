import { Input as ShadcnInput } from './input'

/**
 * shadcn/ui Input — native text field. Pulled via
 * `bunx shadcn@latest add input` (radix-nova style, neutral base color).
 *
 * @example # Basic
 * ```tsx
 * <Input placeholder="you@modo.dev" />
 * ```
 *
 * @example # Password
 * ```tsx
 * <Input type="password" placeholder="••••••••" />
 * ```
 *
 * @example # Disabled
 * ```tsx
 * <Input placeholder="Read only" disabled />
 * ```
 */
export default function Input({ type = 'text', placeholder, defaultValue, disabled = false }: {
  /** HTML input type. @values text, email, password, number, search */
  type?: string
  /** Placeholder text shown when empty. */
  placeholder?: string
  /** Initial value for the uncontrolled input. */
  defaultValue?: string
  /** Disables the input. */
  disabled?: boolean
}) {
  return (
    <ShadcnInput
      type={type}
      placeholder={placeholder}
      defaultValue={defaultValue}
      disabled={disabled}
    />
  )
}
