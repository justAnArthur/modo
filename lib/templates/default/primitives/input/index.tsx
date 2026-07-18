import { define } from 'modo-atomic-ui/define'

export const meta = define({
  name: 'Input',
  description: 'Single-line text input.',
  category: 'primitives',
})

export function Component(props: {
  variant?: 'default' | 'error'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  placeholder?: string
  defaultValue?: string
}) {
  const { variant = 'default', size = 'md', disabled, placeholder, defaultValue } = props
  return (
    <input
      data-variant={variant}
      data-size={size}
      disabled={disabled}
      placeholder={placeholder ?? 'Type here…'}
      defaultValue={defaultValue}
      className="modo-input"
    />
  )
}

export const examples = [
  { name: 'Default',   props: { variant: 'default' }, children: 'Default' },
  { name: 'Error',     props: { variant: 'error' },   children: 'Error' },
  { name: 'Disabled',  props: { variant: 'default', disabled: true }, children: 'Disabled' },
  { name: 'Small',     props: { variant: 'default', size: 'sm' }, children: 'Small' },
  { name: 'Large',     props: { variant: 'default', size: 'lg' }, children: 'Large' },
] as const

export const props = [
  { name: 'variant',    type: 'enum',    values: ['default', 'error'] as const, default: 'default' },
  { name: 'size',       type: 'enum',    values: ['sm', 'md', 'lg'] as const, default: 'md' },
  { name: 'disabled',   type: 'boolean', default: false },
  { name: 'placeholder', type: 'string', default: 'Type here…' },
] as const
