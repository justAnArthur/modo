import { define } from 'modo-atomic-ui/define'

export const meta = define({
  name: 'Badge',
  description: 'Small status indicator or label.',
  category: 'primitives',
})

export function Component(props: {
  tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'info'
  variant?: 'solid' | 'soft' | 'outline'
  size?: 'sm' | 'md'
  children?: React.ReactNode
}) {
  const { tone = 'neutral', variant = 'soft', size = 'sm', children } = props
  return (
    <span data-tone={tone} data-variant={variant} data-size={size} className="modo-badge">
      {children}
    </span>
  )
}

export const examples = [
  { name: 'Neutral / Soft',   props: { tone: 'neutral' }, children: 'Draft' },
  { name: 'Success / Soft',   props: { tone: 'success' }, children: 'Published' },
  { name: 'Warning / Soft',   props: { tone: 'warning' }, children: 'Pending' },
  { name: 'Danger / Soft',    props: { tone: 'danger'  }, children: 'Failed' },
  { name: 'Info / Soft',      props: { tone: 'info'    }, children: 'Beta' },
  { name: 'Solid',            props: { tone: 'success', variant: 'solid' }, children: 'Live' },
  { name: 'Outline',          props: { tone: 'neutral', variant: 'outline' }, children: 'New' },
] as const

export const props = [
  { name: 'tone',     type: 'enum', values: ['neutral', 'success', 'warning', 'danger', 'info'] as const, default: 'neutral' },
  { name: 'variant',  type: 'enum', values: ['solid', 'soft', 'outline'] as const, default: 'soft' },
  { name: 'size',     type: 'enum', values: ['sm', 'md'] as const, default: 'sm' },
] as const
