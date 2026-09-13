import './popover.css'
import { useState } from 'react'

/**
 * Click-to-open floating panel. Simple toggle — no portal, no positioning math.
 *
 * @example
 * # Default
 *
 * ```tsx
 * <Popover trigger="Click me">Popover content here</Popover>
 * ```
 *
 * @example
 * # Rich content
 *
 * The body is a free ReactNode.
 *
 * ```tsx
 * <Popover trigger="Settings"><label><input type="checkbox" /> Notify me</label></Popover>
 * ```
 */
export default function Popover({
  trigger = 'Click me',
  children,
}: {
  /** Trigger content. @default 'Click me' */
  trigger?: React.ReactNode
  /** Panel body content. */
  children?: React.ReactNode
}) {
  const [open, setOpen] = useState(false)

  return (
    <span className="my-popover">
      <button
        type="button"
        className="my-popover-trigger"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        {trigger}
      </button>
      {open && (
        <span className="my-popover-panel">
          {children}
        </span>
      )}
    </span>
  )
}
