import './tooltip.css'
import { useState } from 'react'

/**
 * Floating label on hover. Simple bubble — no popper math.
 *
 * @example
 * # Default
 *
 * ```tsx
 * <Tooltip label="Saved!">Hover me</Tooltip>
 * ```
 *
 * @example
 * # Long label
 *
 * ```tsx
 * <Tooltip label="This is a longer tooltip that wraps less gracefully">Long</Tooltip>
 * ```
 *
 * @example
 * # Custom trigger
 *
 * ```tsx
 * <Tooltip label="Click to copy">📋 Copy</Tooltip>
 * ```
 */
export default function Tooltip({
  label = 'Tooltip text',
  children = 'Hover me',
}: {
  /** Text shown in the tooltip. @default 'Tooltip text' */
  label?: string
  /** The trigger element. @default 'Hover me' */
  children?: React.ReactNode
}) {
  const [open, setOpen] = useState(false)

  return (
    <span className="my-tooltip">
      <span
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        className="my-tooltip-trigger"
      >
        {children}
      </span>
      {open && <span className="my-tooltip-bubble">{label}</span>}
    </span>
  )
}
