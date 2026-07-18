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
 */
export default function Popover({
  trigger = 'Click me',
  content = 'Popover content here',
}: {
  /** Element that opens the popover. @default 'Click me' */
  trigger?: React.ReactNode
  /** Body content. @default 'Popover content here' */
  content?: React.ReactNode
}) {
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
    </div>
  )
}
