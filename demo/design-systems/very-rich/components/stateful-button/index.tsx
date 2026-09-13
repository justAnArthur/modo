import './stateful-button.css'
import { useState } from 'react'

/**
 * A button with internal loading state. Click → 1.5s loading → idle.
 *
 * Demonstrates that interface match on the user's `components/` tier overrides
 * the default `primitives/button` resolver — when `shell.Button` is not pinned
 * in `modo.config.ts`, the lib's resolver still walks `components/` first
 * because the button's required-prop signature (`children`) matches the slot.
 *
 * @example
 * # Default
 *
 * ```tsx
 * <StatefulButton>Submit</StatefulButton>
 * ```
 *
 * @example
 * # Custom onClick
 *
 * ```tsx
 * <StatefulButton onClick={async () => await api.save()}>Save</StatefulButton>
 * ```
 */
export default function StatefulButton({
  children = 'Submit',
  onClick,
  variant = 'primary',
}: {
  /** Button label. @default 'Submit' */
  children?: React.ReactNode
  /** Click handler — runs before the 1.5s loading window. */
  onClick?: () => void | Promise<void>
  /** Visual style. @values primary, secondary, outline, ghost @default 'primary' */
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost'
}) {
  const [loading, setLoading] = useState(false)

  const handleClick = () => {
    if (loading) return
    setLoading(true)
    void Promise.resolve(onClick?.()).finally(() => {
      setTimeout(() => setLoading(false), 1500)
    })
  }

  return (
    <button
      type="button"
      data-variant={variant}
      data-loading={loading}
      className="my-stateful-btn"
      disabled={loading}
      onClick={handleClick}
    >
      {loading ? 'Loading…' : children}
    </button>
  )
}
