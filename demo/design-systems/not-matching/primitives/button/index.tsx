import './button.css'

/**
 * Intentionally missing the `children` prop — the shell slot resolver
 * (which requires `children`) falls through to the lib's built-in shell DS.
 *
 * @example
 * # No children
 *
 * ```tsx
 * <Button />
 * ```
 */
export default function Button({ disabled, onClick }: {
  disabled?: boolean
  onClick?: () => void
}) {
  return (
    <button className="my-btn" disabled={disabled} onClick={onClick} />
  )
}
