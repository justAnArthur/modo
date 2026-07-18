import { define } from 'modo-atomic-ui/define'
import { Elevated } from 'modo-atomic-ui/surfaces-runtime'

export const meta = define({
  name: '__NAME_PASCAL__',
  description: 'TODO: short description of what __NAME__ does.',
  category: 'blocks',
})

export function Component(props: {
  // TODO: define the props your block accepts.
  onSubmit?: () => void
}) {
  const { onSubmit } = props
  return (
    <Elevated offset={1}>
      <form data-block="__NAME__" onSubmit={onSubmit}>
        {/* TODO: build the block UI. */}
        <button type="submit">Submit</button>
      </form>
    </Elevated>
  )
}

export const examples = [
  { name: 'Default' },
] as const

export const props = [
  // TODO: declare each prop with { name, type, values?, default? }.
] as const
