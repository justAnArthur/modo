/*!
 * Local addition: a notch app's permissions, each with the truth macOS tells
 * about it and the one action that fixes it.
 */

'use client'

import Button from '@justanarthur/modo-ui/components/actions/button'
import List, { LIST_SWITCH } from '@justanarthur/modo-ui/components/data-display/list'
import StatusDot from '@justanarthur/modo-ui/components/feedback/status-dot'
import type { ReactNode } from 'react'

/** What macOS says about a permission: granted, never asked, turned off, or on in System Settings but not honoured (stale). */
type PermissionState = 'allowed' | 'notAsked' | 'off' | 'stale'

interface PermissionItem {
  id: string
  /** Its name: `Accessibility`, `Calendars`. */
  label: string
  /** What it powers, naming the features: `Window management, clipboard paste`. */
  description: ReactNode
  /** What macOS says; unset while it's being read. */
  state?: PermissionState
  /** A line under the description, replacing the state's own (how to turn it on, what to do after). */
  note?: ReactNode
  /** The row's action, replacing the state's button: the Fix slot. */
  action?: ReactNode
}

interface PermissionListProps {
  /** The permissions, in order. */
  permissions: PermissionItem[]
  /** Called by a row's button with the permission and its state: ask (`notAsked`), open System Settings (`off`), reset and ask again (`stale`). */
  onFix?: (id: string, state: PermissionState) => void
  /** The section's caption. Defaults to `'Privacy & Security'`. */
  title?: string
  /** Content at the end of the caption's line, such as a count. */
  aside?: ReactNode
}

const STATES: Record<
  PermissionState,
  { word: string; dot: 'success' | 'idle' | 'waiting' | 'error'; button?: string; note?: string }
> = {
  allowed: { word: 'Allowed', dot: 'success' },
  notAsked: { word: 'Not asked', dot: 'idle', button: 'Allow…' },
  off: {
    word: 'Off',
    dot: 'waiting',
    button: 'Open System Settings',
    note: 'Turn it on in System Settings, then come back.',
  },
  stale: {
    word: 'Needs reset',
    dot: 'error',
    button: 'Fix',
    note: "System Settings shows it as on, but macOS isn't honouring it. This happens after some updates.",
  },
}

/** How many permissions need the user: off or stale. For a badge on the Permissions row. */
const permissionsNeedingAttention = (permissions: PermissionItem[]) =>
  permissions.filter(permission => permission.state === 'off' || permission.state === 'stale').length

function PermissionRow({ permission, onFix }: { permission: PermissionItem; onFix?: PermissionListProps['onFix'] }) {
  const { state } = permission
  const known = state ? STATES[state] : undefined
  const note = permission.note ?? known?.note
  const action =
    permission.action ??
    (state && known?.button ? (
      <Button
        variant={state === 'stale' ? 'primary' : 'secondary'}
        size="compact"
        className={LIST_SWITCH}
        onClick={() => onFix?.(permission.id, state)}
      >
        {known.button}
      </Button>
    ) : (
      <span className="pr-3 text-caption text-muted-foreground">{known ? known.word : 'Checking…'}</span>
    ))

  return (
    <List.Row
      label={
        <span className="flex min-w-0 items-center gap-2">
          <StatusDot status={known?.dot ?? 'running'} label={known?.word ?? 'Checking'} />
          <span className="truncate">{permission.label}</span>
          {known && state !== 'allowed' && (
            <span className="shrink-0 text-caption text-muted-foreground">{known.word}</span>
          )}
        </span>
      }
      description={
        note ? (
          <>
            {permission.description}
            <br />
            {note}
          </>
        ) : (
          permission.description
        )
      }
    >
      {action}
    </List.Row>
  )
}

/**
 * A notch app's permissions, one row each, telling the truth in four states:
 * **Allowed**, **Not asked** (Allow… asks in context), **Off** (Open System
 * Settings, then come back) and **Needs reset**, a grant System Settings
 * shows but macOS no longer honours, as after an update re-signs the app
 * (Fix resets it and asks again). Unset, a row is being read.
 *
 * Each row names what the permission powers, a StatusDot in the state's hue
 * and the state in words, and one action at the end, lined up with the
 * Switches of the rows around it. `onFix` gets the permission and its state,
 * so the host runs the right fix; a row's `action` replaces the button (the
 * Fix slot) and its `note` the state's line. `permissionsNeedingAttention`
 * counts the rows off or stale, for a badge.
 *
 * @example {@include ./examples.mdx}
 */
export default function PermissionList({
  permissions,
  onFix,
  title = 'Privacy & Security',
  aside,
}: PermissionListProps) {
  return (
    <List>
      <List.Section title={title} aside={aside}>
        {permissions.map(permission => (
          <PermissionRow key={permission.id} permission={permission} onFix={onFix} />
        ))}
      </List.Section>
    </List>
  )
}

export type { PermissionItem, PermissionListProps, PermissionState }
export { PermissionList, permissionsNeedingAttention }
