/*!
 * Local addition: the AI app's session states on the design system's status
 * glyphs (see StatusDot): running turns, waiting is the warning dot, unread
 * and idle use the Sidebar's own dots, so only those two map here.
 */

import { glyph } from '../../components/status-dot'
import type { IconComponent } from '../../lib/icon-context'
import type { SessionStatus } from './mock'

export const RunningGlyph = glyph('running')
export const WaitingGlyph = glyph('waiting')

/** The glyph for a session state; unread and idle use the Sidebar's own dots instead. */
export const STATUS_GLYPH: Partial<Record<SessionStatus, IconComponent>> = {
  running: RunningGlyph,
  waiting: WaitingGlyph,
}

export const STATUS_LABEL: Record<SessionStatus, string> = {
  running: 'Running',
  waiting: 'Needs your input',
  unread: 'Unread',
  idle: 'Idle',
}
