import './popover.css'
import { Elevated } from 'modo-atomic-ui'
import { useEffect, useRef, useState } from 'react'

/**
 * A popover whose panel grows from the trigger corner: it's laid out at full
 * size but clipped to the corner nearest the trigger, then unclips as one
 * piece. The panel body is wrapped in `<Elevated offset={2}>` for the
 * surface background + shadow, and the outer wrapper carries a `drop-shadow`
 * filter so the shadow hugs the clipped shape (a plain box-shadow would
 * just be clipped away).
 *
 * @example
 * # Default
 *
 * Click the trigger to see the panel grow from its corner.
 *
 * ```tsx
 * <Popover trigger="Click me" content="Popover content here" />
 * ```
 *
 * @example
 * # Top placement
 *
 * Panel grows from above the trigger.
 *
 * ```tsx
 * <Popover trigger="Open up" content="Opens upward" placement="top" />
 * ```
 *
 * @example
 * # Rich content
 *
 * The panel wraps any React node, including forms, lists, or cards.
 *
 * ```tsx
 * <Popover trigger="Settings" content={<form><input type="checkbox" /> Notify me</form>} />
 * ```
 */
export default function Popover({
  trigger = 'Click me',
  content = 'Popover content here',
  placement = 'bottom',
}: {
  /** text on the trigger button @default 'Click me' */
  trigger?: React.ReactNode
  /** body content @default 'Popover content here' */
  content?: React.ReactNode
  /** preferred side @values top, bottom @default 'bottom' */
  placement?: 'top' | 'bottom'
}) {
  const rootRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const toggle = () => setOpen((v) => !v)
  const close = () => setOpen(false)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close()
    const onPointer = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node))
        close()
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('pointerdown', onPointer)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('pointerdown', onPointer)
    }
  }, [open])

  const align: 'start' | 'end' = 'end'
  const radius = 16
  const sideOffset = 8

  // clip-path that hides everything but the corner nearest the trigger.
  const clipHidden = `inset(${
    placement === 'bottom' ? '0%' : '92%'
  } ${align === 'end' ? '0%' : '92%'} ${
    placement === 'bottom' ? '92%' : '0%'
  } ${align === 'end' ? '92%' : '0%'} round ${radius}px)`
  const clipShown = `inset(0% 0% 0% 0% round ${radius}px)`

  const transformOrigin =
    `${placement === 'bottom' ? 'top' : 'bottom'} ${align === 'end' ? 'right' : 'left'}`

  const wrapStyle: React.CSSProperties = {
    position: 'absolute',
    zIndex: 30,
    transformOrigin,
    top: placement === 'bottom' ? '100%' : undefined,
    bottom: placement === 'top' ? '100%' : undefined,
    right: 0,
    marginTop: placement === 'bottom' ? sideOffset : undefined,
    marginBottom: placement === 'top' ? sideOffset : undefined,
    opacity: open ? 1 : 0,
    transform: open ? 'scale(1)' : 'scale(0.96)',
    filter: open
      ? 'drop-shadow(0 10px 18px var(--shadow-color, rgba(0, 0, 0, 0.14)))'
      : 'drop-shadow(0 0 0 transparent)',
    pointerEvents: open ? 'auto' : 'none',
    transition:
      'opacity 200ms var(--standard, ease), transform 200ms var(--standard, ease), filter 200ms var(--standard, ease)',
  }

  const clipStyle: React.CSSProperties = {
    overflow: 'hidden',
    borderRadius: radius,
    clipPath: open ? clipShown : clipHidden,
    transition: 'clip-path 320ms cubic-bezier(0.34, 1.56, 0.64, 1)',
  }

  return (
    <div
      ref={rootRef}
      data-aui="popover"
      style={{ position: 'relative', display: 'inline-flex' }}
    >
      <button
        type="button"
        data-aui="popover-trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        data-state={open ? 'open' : 'closed'}
        onClick={toggle}
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
        data-aui="popover-wrap"
        style={wrapStyle}
        inert={!open}
        aria-hidden={!open}
      >
        <Elevated offset={2} className="popover-body" style={clipStyle}>
          <div role="menu" data-aui="popover-panel">
            {content}
          </div>
        </Elevated>
      </div>
    </div>
  )
}
