import './popover.css'

/**
 * Floats above the page when triggered. Uses `<Elevated offset={2}>` so it stays
 * one notch above its substrate.
 *
 * @example
 * # Default
 *
 * ```tsx
 * <Popover trigger="Click me" content="Popover content here" />
 * ```
 *
 * @example
 * # Top placement
 *
 * ```tsx
 * <Popover trigger="Click me" placement="top" content="Floating above" />
 * ```
 *
 * @example
 * # Rich content
 *
 * ```tsx
 * <Popover trigger="Click me" content="Popover with longer body to show how the surface lifts relative to the page." />
 * ```
 */
export default function Popover({
  trigger = 'Click me',
  content = 'Popover content here',
  placement = 'bottom',
}: {
  /** Element that opens the popover. @default 'Click me' */
  trigger?: React.ReactNode
  /** Body content. @default 'Popover content here' */
  content?: React.ReactNode
  /** Preferred side. @values top, bottom */
  placement?: 'top' | 'bottom'
}) {
  // for the docs site we always render the body visible (so the example
  // preview shows both pieces). in a real app this would be a click/toggle.
  return (
    <div data-aui="popover" style={{ position: 'relative', display: 'inline-block' }}>
      <button
        data-aui="popover-trigger"
        style={{
          background: 'var(--accent)',
          color: 'var(--accent-foreground)',
          border: 'none',
          borderRadius: 'var(--radius-md, 6px)',
          padding: '6px 12px',
          font: 'inherit',
          cursor: 'pointer',
        }}
      >
        {trigger}
      </button>
      <div
        data-aui="popover-body"
        style={{
          position: 'absolute',
          top: 'calc(100% + 6px)',
          left: 0,
          minWidth: 200,
          padding: 10,
          background: 'var(--surface-3, var(--background))',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md, 6px)',
          boxShadow: 'var(--shadow-2)',
          fontSize: 12,
          color: 'var(--foreground)',
          zIndex: 10,
        }}
      >
        {content}
      </div>
    </div>
  )
}
