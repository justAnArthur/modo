import { define } from 'modo-atomic-ui/define'
import { Elevated } from 'modo-atomic-ui/surfaces-runtime'
import { useState, useRef, useEffect, type ReactNode } from 'react'

export const meta = define({
  name: 'Popover',
  description: 'Floats above the page when triggered. Uses <Elevated offset={2}> so it stays one notch above its substrate.',
  category: 'components',
})

export function Component(props: {
  trigger?: ReactNode
  content?: ReactNode
  placement?: 'top' | 'bottom'
}) {
  const { trigger = 'Click me', content = 'Popover content here', placement = 'bottom' } = props
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div ref={ref} data-aui="popover" style={{ position: 'relative', display: 'inline-block' }}>
      <button
        data-aui="popover-trigger"
        onClick={() => setOpen((o) => !o)}
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
      {open && (
        <div
          data-aui="popover-content-wrap"
          style={{
            position: 'absolute',
            top: placement === 'bottom' ? 'calc(100% + 8px)' : 'auto',
            bottom: placement === 'top' ? 'calc(100% + 8px)' : 'auto',
            left: 0,
            zIndex: 10,
          }}
        >
          <Elevated
            data-aui="popover-content"
            offset={2}
            style={{
              padding: '12px 16px',
              borderRadius: 'var(--radius-lg, 8px)',
              minWidth: 200,
              fontSize: 13,
              color: 'var(--foreground)',
            }}
          >
            {content}
          </Elevated>
        </div>
      )}
    </div>
  )
}

export const examples = [
  { name: 'Default',   props: { content: 'Popover content here' }, children: 'Click me' },
  { name: 'Top placement', props: { placement: 'top', content: 'Floating above' }, children: 'Top' },
  { name: 'Rich content', props: { content: 'Popover with longer body to show how the surface lifts relative to the page.' }, children: 'Rich' },
] as const

export const props = [
  { name: 'trigger',    type: 'react-node', default: 'Click me' },
  { name: 'content',    type: 'react-node', default: 'Popover content here' },
  { name: 'placement',  type: 'enum', values: ['top', 'bottom'] as const, default: 'bottom' },
] as const
