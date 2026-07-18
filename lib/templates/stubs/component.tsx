// stub for `modo add component <name>`.
import { Elevated } from 'modo-atomic-ui/surfaces-runtime'

export default function __NAME_PASCAL__({
  // TODO: define the props your component accepts.
  trigger,
  children,
}: {
  trigger?: React.ReactNode
  children?: React.ReactNode
}) {
  return (
    <Elevated offset={3}>
      <div data-component="__NAME__">
        {trigger}
        {children}
      </div>
    </Elevated>
  )
}
