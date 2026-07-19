import './tooltip.css'
import { useState } from "react";

/**
 * Floating label that appears on hover. Uses `<Elevated offset={3}>`.
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
    <span
      data-aui="tooltip"
      style={{ position: 'relative', display: 'inline-block' }}
      tabIndex={0}
    >
      <span
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        data-aui="tooltip-trigger"
        style={{
          display: 'inline-block',
          padding: '4px 8px',
          border: '1px dashed var(--border)',
          borderRadius: 'var(--radius-md, 6px)',
        }}
      >
        {children}
      </span>

      {open &&
				<span
					data-aui="tooltip-body"
					style={{
            position: 'absolute',
            bottom: 'calc(100% + 6px)',
            left: '50%',
            transform: 'translateX(-50%)',
            padding: '4px 8px',
            background: 'var(--surface-3, var(--background))',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm, 4px)',
            boxShadow: 'var(--shadow-3)',
            fontSize: 11,
            color: 'var(--foreground)',
            whiteSpace: 'nowrap',
            zIndex: 10,
          }}
				>
        {label}
      </span>}
    </span>
  )
}
