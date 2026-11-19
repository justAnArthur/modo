/*!
 * Local addition: what each cell state is called and the badge it wears.
 * Pure tables, so a Server Component can read them.
 */

import type { BadgeColor } from '@justanarthur/modo-ui/components/data-display/badge/variants'
import type { ShownState } from './types'

/** Every state a cell can show, in the legend's order. */
export const SHOWN_STATES: ShownState[] = [
  'pass',
  'pass-older',
  'fail',
  'running',
  'pr-open',
  'checking',
  'error',
  'stale',
  'waived',
  'unchecked',
]

export const STATE_LABEL: Record<ShownState, string> = {
  pass: 'Pass',
  'pass-older': 'Passes an older version',
  fail: 'Fail',
  running: 'Worker on it',
  'pr-open': 'PR open',
  checking: 'Checking',
  error: "Couldn't check",
  stale: 'Stale',
  waived: 'Waived',
  unchecked: 'Not checked yet',
}

export const STATE_BADGE: Record<ShownState, BadgeColor> = {
  pass: 'green',
  'pass-older': 'green',
  fail: 'red',
  running: 'amber',
  'pr-open': 'blue',
  checking: 'gray',
  error: 'gray',
  stale: 'gray',
  waived: 'gray',
  unchecked: 'gray',
}
