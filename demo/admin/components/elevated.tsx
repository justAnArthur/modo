// convention file the lib imports as `modo.elevated` (resolved via
// the vite alias in lib/src/runtime/vite.config.ts) and renders
// behind the page and behind each example-card-stage.
//
// wraps the local `Elevated` surface primitive with sensible props
// for "background" use: a couple of levels above the substrate so
// the page reads as raised, no shadow (a page-elevated with a
// box-shadow would look like a card filling the viewport).

import { Elevated } from '../../components/surface/elevated'

export default function ElevatedBg() {
  return <Elevated offset={2} shadowLevel={0} />
}
