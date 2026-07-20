// convention file the lib imports as `modo.elevated` (resolved via
// the `elevatedPlugin` vite plugin in lib/src/runtime/plugins/elevated.ts).
// OPTIONAL: the lib falls back to a noop if this file is absent.
//
// the lib uses this component in two places:
//   1. as the wrapper for the main content area (when this file exists
//      the layout renders <Elevated data-aui="content"> instead of
//      <main data-aui="content">).
//   2. as the background behind each example-card-stage.
//
// wraps the local `Elevated` surface primitive with sensible defaults
// for both roles: a couple of levels above the substrate so the content
// reads as raised, no shadow (a page-elevated with a box-shadow would
// look like a card filling the viewport). children and other props are
// forwarded so the lib can use the same wrapper for both call sites.

import type { ReactNode } from 'react'
import { Elevated } from '../../components/surface/elevated'

interface ElevatedBgProps {
  children?: ReactNode
  [key: string]: unknown
}

export default function ElevatedBg({ children, ...props }: ElevatedBgProps) {
  return (
    <Elevated offset={2} shadowLevel={0} {...props}>
      {children}
    </Elevated>
  )
}
