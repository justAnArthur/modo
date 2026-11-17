/*!
 * Local addition: the AI app's error and degraded states in one block — the
 * claude process crashed, the connection is coming back, a profile hit its
 * limit, the machine is offline, a sign-in expired. Each is a banner over
 * the transcript or a full empty state, with the one action that gets the
 * session going again.
 */

'use client'

import { SurfaceProvider, useSurface } from '@justanarthur/modo-ui'
import Button from '@justanarthur/modo-ui/components/actions/button'
import LogView from '@justanarthur/modo-ui/components/data-display/log-view'
import Meter from '@justanarthur/modo-ui/components/feedback/meter'
import { Spinner } from '@justanarthur/modo-ui/components/feedback/progress'
import { useShape } from '@justanarthur/modo-ui/lib/shape-context'
import { SURFACE_BG } from '@justanarthur/modo-ui/lib/surface-classes'
import { cn } from '@justanarthur/modo-ui/lib/utils'
import { type ReactNode, useState } from 'react'
import { type IconName, useIcon } from '../../../lib/icons'
import type { Profile } from '../../../lib/types'

export type FailureKind = 'cli-crashed' | 'reconnecting' | 'rate-limited' | 'offline' | 'auth-expired'

const ICON: Record<Exclude<FailureKind, 'reconnecting'>, { icon: IconName; tone: string }> = {
  'cli-crashed': { icon: 'circle-x', tone: 'text-status-error' },
  'rate-limited': { icon: 'gauge', tone: 'text-status-warning' },
  offline: { icon: 'cloud', tone: 'text-muted-foreground' },
  'auth-expired': { icon: 'key', tone: 'text-status-warning' },
}

interface FailureStateProps {
  /** Which state: the claude process exited, the connection is being retried, a limit was hit, no network, or the sign-in expired. */
  kind: FailureKind
  /** A strip over the transcript, or the whole pane's empty state. Defaults to `'banner'`. */
  variant?: 'banner' | 'page'
  /** The profile it concerns: the one rate-limited or signed out. */
  profile?: Profile
  /** For `cli-crashed`: the last lines claude printed to stderr. */
  stderr?: string[]
  /** For `cli-crashed`: the exit code, or the signal it died of. */
  exitCode?: number | string
  /** For `reconnecting`: this attempt, counted from 1. Defaults to `1`. */
  attempt?: number
  /** For `reconnecting`: how many attempts before it gives up. Defaults to `5`. */
  maxAttempts?: number
  /** For `reconnecting`: the time to the next attempt, as it reads ("4s"). */
  retryIn?: string
  /** For `rate-limited`: when the limit resets, as it reads ("in 1h 12m", "at 14:05"). */
  resetsIn?: string
  /** For `rate-limited`: the profiles with room to move the session to, the roomiest first. */
  alternatives?: Profile[]
  /** Called when Restart is pressed (`cli-crashed`). */
  onRestart?: () => void
  /** Called when Retry now is pressed (`reconnecting`, `offline`). */
  onRetry?: () => void
  /** Called with a profile id when the session moves to it (`rate-limited`). */
  onSwitchProfile?: (profileId: string) => void
  /** Called when Sign in again is pressed (`auth-expired`). */
  onLogin?: () => void
  /** Called when a banner's ✕ is pressed; without it, the banner has none. */
  onDismiss?: () => void
  /** Classes for the root. */
  className?: string
}

/**
 * What the app shows when a session can't go on: the claude process
 * crashed, the connection dropped, a profile hit its limit, the machine is
 * offline, or a sign-in expired.
 *
 * Each state says what happened, in which profile, and the one thing that
 * gets the session going again. A crash keeps the last of claude's stderr
 * in a log, with Restart (the transcript is kept). Reconnecting counts its
 * attempts and the time to the next one. A rate limit names the profile,
 * when it resets and the profiles with room, so the session can move there
 * in one press. Offline waits for the network; an expired sign-in runs
 * `claude login` again. As a `banner` it sits over the transcript, which
 * stays readable under it; as a `page` it fills the pane where the
 * transcript would be.
 *
 * @example {@include ./examples.mdx}
 */
export default function FailureState({
  kind,
  variant = 'banner',
  profile,
  stderr = [],
  exitCode,
  attempt = 1,
  maxAttempts = 5,
  retryIn,
  resetsIn,
  alternatives = [],
  onRestart,
  onRetry,
  onSwitchProfile,
  onLogin,
  onDismiss,
  className,
}: FailureStateProps) {
  const [showLog, setShowLog] = useState(variant === 'page')
  const shape = useShape()
  const level = Math.min(useSurface() + 1, 8)
  const X = useIcon('x')
  const Retry = useIcon('rotate-ccw')
  const Terminal = useIcon('terminal')
  const Key = useIcon('key')
  const page = variant === 'page'
  const name = profile?.name ?? 'this profile'

  const copy: Record<FailureKind, { title: string; detail: ReactNode }> = {
    'cli-crashed': {
      title: 'claude stopped',
      detail: `The process exited${exitCode === undefined ? '' : ` (${exitCode})`}. The transcript is kept; Restart picks the session up where it was.`,
    },
    reconnecting: {
      title: 'Reconnecting…',
      detail: `Attempt ${attempt} of ${maxAttempts}${retryIn ? ` · next in ${retryIn}` : ''}. Replies resume once it is back.`,
    },
    'rate-limited': {
      title: `${name} hit its limit`,
      detail: `${resetsIn ? `It resets ${resetsIn}.` : 'It resets soon.'}${alternatives.length > 0 ? ' Move the session to a profile with room, or wait.' : ''}`,
    },
    offline: {
      title: 'You are offline',
      detail: 'Sessions pause until the network is back; nothing you typed is lost.',
    },
    'auth-expired': {
      title: `${name} is signed out`,
      detail: `The sign-in for ${profile?.configDir ?? 'its config dir'} expired. Sign in again to keep going.`,
    },
  }

  const icon =
    kind === 'reconnecting' ? (
      <Spinner className={page ? 'size-5' : 'size-4'} />
    ) : (
      <Glyph icon={ICON[kind].icon} className={ICON[kind].tone} size={page ? 20 : 16} />
    )

  const actions = (
    <>
      {kind === 'cli-crashed' && !page && stderr.length > 0 && (
        <Button
          variant="ghost"
          size="compact"
          leadingIcon={Terminal}
          active={showLog}
          onClick={() => setShowLog(!showLog)}
        >
          Output
        </Button>
      )}
      {kind === 'cli-crashed' && (
        <Button variant={page ? 'primary' : 'secondary'} size="compact" leadingIcon={Retry} onClick={onRestart}>
          Restart
        </Button>
      )}
      {(kind === 'reconnecting' || kind === 'offline') && (
        <Button variant="secondary" size="compact" onClick={onRetry}>
          Retry now
        </Button>
      )}
      {kind === 'rate-limited' &&
        alternatives.slice(0, page ? 3 : 1).map((alt, i) => (
          <Button
            key={alt.id}
            variant={i === 0 ? 'secondary' : 'ghost'}
            size="compact"
            onClick={() => onSwitchProfile?.(alt.id)}
          >
            Continue in {alt.name}
          </Button>
        ))}
      {kind === 'auth-expired' && (
        <Button variant={page ? 'primary' : 'secondary'} size="compact" leadingIcon={Key} onClick={onLogin}>
          Sign in again
        </Button>
      )}
    </>
  )

  const progress = kind === 'reconnecting' && (
    <Meter
      variant="line"
      label="Reconnect attempts"
      value={attempt}
      max={maxAttempts}
      className={page ? 'w-48' : 'w-16'}
    />
  )
  const log = kind === 'cli-crashed' && showLog && stderr.length > 0 && (
    <LogView label="claude stderr" lines={stderr} prompt="" maxHeight={page ? 220 : 140} wrap className="w-full" />
  )

  if (page)
    return (
      <div
        role={kind === 'reconnecting' ? 'status' : 'alert'}
        className={cn(
          'flex h-full w-full flex-col items-center justify-center gap-[var(--space-4)] p-[var(--space-6)]',
          className,
        )}
      >
        <div className="flex max-w-md flex-col items-center gap-[var(--space-2)] text-center">
          {icon}
          <h2 className="m-0 text-title text-foreground">{copy[kind].title}</h2>
          <p className="m-0 text-body text-muted-foreground">{copy[kind].detail}</p>
          {kind === 'rate-limited' && profile && <LimitMeters profile={profile} />}
          {progress}
        </div>
        {log && <div className="flex w-full max-w-xl">{log}</div>}
        <div className="flex flex-wrap items-center justify-center gap-[var(--space-2)]">{actions}</div>
      </div>
    )

  return (
    <SurfaceProvider value={level}>
      <div
        role={kind === 'reconnecting' ? 'status' : 'alert'}
        className={cn(
          'flex flex-col gap-[var(--space-2)] border border-border p-[var(--space-2)] pl-[var(--space-3)]',
          SURFACE_BG[level],
          shape.container,
          className,
        )}
      >
        <div className="flex items-center gap-[var(--space-3)]">
          <span className="flex shrink-0">{icon}</span>
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-body weight-medium text-foreground">{copy[kind].title}</span>
            <span className="truncate text-caption text-muted-foreground">{copy[kind].detail}</span>
          </div>
          {progress}
          <div className="flex shrink-0 items-center gap-[var(--space-1)]">
            {actions}
            {onDismiss && (
              <Button variant="ghost" size="icon-compact" aria-label="Dismiss" onClick={onDismiss}>
                <X />
              </Button>
            )}
          </div>
        </div>
        {log}
      </div>
    </SurfaceProvider>
  )
}

function Glyph({ icon, className, size }: { icon: IconName; className: string; size: number }) {
  const Icon = useIcon(icon)
  return <Icon size={size} strokeWidth={1.5} className={className} />
}

function LimitMeters({ profile }: { profile: Profile }) {
  return (
    <div className="flex w-64 flex-col gap-[var(--space-1)] pt-[var(--space-2)]">
      {profile.limits.map(limit => (
        <div key={limit.label} className="flex items-center gap-[var(--space-2)] text-caption">
          <span className="w-32 shrink-0 truncate text-left text-muted-foreground">{limit.label}</span>
          <Meter variant="line" label={limit.label} value={limit.value} className="flex-1" />
          <span className="w-10 shrink-0 text-right tabular-nums text-muted-foreground">
            {Math.round(limit.value * 100)}%
          </span>
        </div>
      ))}
    </div>
  )
}

export type { FailureStateProps }

export { FailureState }
