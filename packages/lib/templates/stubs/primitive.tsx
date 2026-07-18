import { define } from 'modo-atomic-ui/define'

export const meta = define({
  name: '__NAME_PASCAL__',
  description: 'TODO: short description of what __NAME__ does.',
  category: 'primitives',
})

export function Component(props: {
  // TODO: define the props your primitive accepts.
  children?: React.ReactNode
}) {
  const { children } = props
  return <div data-component="__NAME__">{children}</div>
}

export const examples = [
  { name: 'Default', children: '__NAME__' },
] as const

export const props = [
  // TODO: declare each prop with { name, type, values?, default? }.
  //   type: 'enum' | 'boolean' | 'string' | 'number' | 'react-node'
] as const
