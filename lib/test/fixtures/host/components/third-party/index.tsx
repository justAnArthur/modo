import { ghost } from 'ghost-src'
import { plain } from 'plain-src'

/** Text from two packages that declare a `source` condition but don't use modo. */
export default function ThirdParty() {
  return (
    <span>
      {ghost} {plain}
    </span>
  )
}
