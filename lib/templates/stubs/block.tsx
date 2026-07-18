// stub for `modo add block <name>`.
import { Elevated } from 'modo-atomic-ui'

export default function __NAME_PASCAL__({
  onSubmit,
}: {
  onSubmit?: () => void
} = {}) {
  return (
    <Elevated offset={1}>
      <form data-block="__NAME__" onSubmit={onSubmit}>
        {/* TODO: build the block UI. */}
        <button type="submit">Submit</button>
      </form>
    </Elevated>
  )
}
