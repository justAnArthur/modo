import { define } from 'modo-atomic-ui/define'
import { Elevated } from 'modo-atomic-ui/surfaces-runtime'

export const meta = define({
  name: '__NAME_PASCAL__',
  description: 'TODO: short description of what __NAME__ does.',
  category: 'components',
})

export function Component(props: {
  // TODO: define the props your component accepts.
  trigger?: React.ReactNode
  children?: React.ReactNode
}) {
  const { trigger, children } = props
  return (
    <Elevated offset={3}>
      <div data-component="__NAME__">
        {trigger}
        {children}
      </div>
    </Elevated>
  )
}

export const examples = [
  { name: 'Default', props: { trigger: <button>Open</button> }, children: 'body' },
] as const

export const props = [
  // TODO: declare each prop with { name, type, values?, default? }.
] as const
