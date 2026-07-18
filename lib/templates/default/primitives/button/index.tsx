import { define } from 'modo-atomic-ui/define'

export const meta = define({
  name: 'Button',
  description: 'Triggers an action or event.',
  category: 'primitives',
})

export function Component(props: {
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  children?: React.ReactNode
}) {
  const { variant = 'primary', size = 'md', disabled, children } = props
  return (
    <button
      data-variant={variant}
      data-size={size}
      disabled={disabled}
      className="modo-button"
    >
      {children}
    </button>
  )
}

export const examples = [
  { name: 'Primary',   props: { variant: 'primary'   }, children: 'Save' },
  { name: 'Secondary', props: { variant: 'secondary' }, children: 'Cancel' },
  { name: 'Ghost',     props: { variant: 'ghost'     }, children: 'Skip' },
  { name: 'Disabled',  props: { variant: 'primary', disabled: true }, children: 'Save' },
] as const

export const props = [
  { name: 'variant',  type: 'enum',    values: ['primary', 'secondary', 'ghost'] as const, default: 'primary' },
  { name: 'size',     type: 'enum',    values: ['sm', 'md', 'lg'] as const, default: 'md' },
  { name: 'disabled', type: 'boolean', default: false },
] as const
