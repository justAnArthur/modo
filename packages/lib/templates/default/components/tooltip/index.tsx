import { define } from 'modo-atomic-ui/define'
import { Elevated } from 'modo-atomic-ui/surfaces-runtime'
import { useState, type ReactNode } from 'react'

export const meta = define({
  name: 'Tooltip',
  description: 'Floating label that appears on hover. Uses <Elevated offset={3}>.',
  category: 'components',
})

export function Component(props: {
  label?: string
  children?: ReactNode
}) {
  const { label = 'Tooltip text', children = 'Hover me' } = props
  const [open, setOpen] = useState(false)

  return (
    <span
      data-aui="tooltip"
      style={{ position: 'relative', display: 'inline-block' }}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      tabIndex={0}
    >
      <span data-aui="tooltip-trigger" style={{ display: 'inline-block', padding: '4px 8px', border: '1px dashed var(--border)', borderRadius: 'var(--radius-md, 6px)' }}>
        {children}
      </span>
      {open && (
        <span
          data-aui="tooltip-content-wrap"
          style={{
            position: 'absolute',
            bottom: 'calc(100% + 6px)',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 10,
            whiteSpace: 'nowrap',
          }}
        >
          <Elevated
            data-aui="tooltip-content"
            offset={3}
            style={{
              padding: '4px 8px',
              borderRadius: 'var(--radius-sm, 4px)',
              fontSize: 12,
              color: 'var(--foreground)',
            }}
          >
            {label}
          </Elevated>
        </span>
      )}
    </span>
  )
}

export const examples = [
  { name: 'Default', props: { label: 'Saved!' }, children: 'Hover me' },
  { name: 'Long label', props: { label: 'This is a longer tooltip that wraps less gracefully' }, children: 'Long' },
  { name: 'Custom trigger', props: { label: 'Click to copy' }, children: '📋 Copy' },
] as const

export const props = [
  { name: 'label', type: 'string', default: 'Tooltip text' },
  { name: 'children', type: 'react-node', default: 'Hover me' },
] as const
