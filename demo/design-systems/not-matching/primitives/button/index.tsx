import './button.css'

/**
 * Intentionally missing the `children` prop — the shell slot resolver
 * (which requires `children`) cannot match this primitive, so the lib
 * logs a warning and the Button slot is omitted from the chrome.
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
