/*!
 * Local addition: the AI app's session states on the design system's status
 * glyphs (see StatusDot): running turns, waiting is the warning dot, failed
 * the error dot, unread
 * and idle use the Sidebar's own dots, so only those two map here.
 */

import { statusGlyph } from '@justanarthur/modo-ui/components/feedback/status-dot'
import type { IconComponent } from './icons'
import type { SessionStatus } from './types'

export const RunningGlyph: IconComponent = statusGlyph('running')
export const WaitingGlyph: IconComponent = statusGlyph('waiting')
export const FailedGlyph: IconComponent = statusGlyph('error')

/** The glyph for a session state; unread and idle use the Sidebar's own dots instead. */
export const STATUS_GLYPH: Partial<Record<SessionStatus, IconComponent>> = {
  running: RunningGlyph,
  waiting: WaitingGlyph,
  failed: FailedGlyph,
}

export const STATUS_LABEL: Record<SessionStatus, string> = {
  running: 'Running',
  waiting: 'Needs your input',
  failed: 'Failed',
  unread: 'Unread',
  idle: 'Idle',
}
