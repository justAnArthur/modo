/*!
 * Local addition: what each cell state is called and the badge it wears,
 * what each asset kind is called, and what each permission mode lets a worker do. Pure tables, so a Server Component can
 * read them.
 */

import type { BadgeColor } from '@justanarthur/modo-ui/components/data-display/badge/variants'
import type { AssetKind, PermissionMode, ShownState } from './types'

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

export const KIND_LABEL: Record<AssetKind, string> = {
  website: 'website',
  webapp: 'web app',
  mobile: 'mobile app',
  repo: 'repo',
  social: 'social account',
  newsletter: 'newsletter',
  api: 'API',
}

/** Each permission mode as the app names it, and what it lets a worker do, in a line. */
export const PERMISSION: Record<PermissionMode, { label: string; note: string }> = {
  manual: { label: 'Ask for everything', note: 'Asks before every edit and every command.' },
  acceptEdits: {
    label: 'Allow edits',
    note: 'Edits files in the worktree; asks before a command that isn’t allowed below.',
  },
  auto: { label: 'Auto', note: 'Claude Code decides what is safe to run, and asks about the rest.' },
  dontAsk: { label: 'Don’t ask', note: 'Never asks: whatever isn’t allowed below is denied.' },
  plan: { label: 'Plan only', note: 'Reads and plans; edits nothing.' },
  bypassPermissions: {
    label: 'Trusted',
    note: 'Runs any command in the worktree without asking. Only for a worker you trust.',
  },
}
