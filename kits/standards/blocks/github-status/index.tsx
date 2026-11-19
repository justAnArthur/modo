/*!
 * Local addition: who the app's `gh` is signed in as, and the device-code
 * sign-in when it isn't. Presentational: the status, the sign-in's code and
 * the callbacks come in as props; `standards github login` runs outside.
 */

'use client'

import Button from '@justanarthur/modo-ui/components/actions/button'
import Copy from '@justanarthur/modo-ui/components/actions/copy'
import { Spinner } from '@justanarthur/modo-ui/components/feedback/progress'
import StatusDot from '@justanarthur/modo-ui/components/feedback/status-dot'
import { cn } from '@justanarthur/modo-ui/lib/utils'
import Skeleton from '@justanarthur/modo-ui/primitives/content/skeleton'
import { ArrowUpRight, LogIn } from 'lucide-react'
import type { GithubAuth } from '../../lib/types'

interface GithubStatusProps {
  /** What `standards github status` printed. Left out while it is read: a skeleton line. */
  status?: GithubAuth
  /** `gh auth login` is running. Defaults to `false`. */
  signingIn?: boolean
  /** The one-time code it printed, once it has. */
  code?: string
  /** Why the last sign-in failed. */
  error?: string
  /** Called on Sign in. */
  onSignIn?: () => void
  /** Called on Open GitHub: the app sends Enter to `gh`, which opens the device page in the browser. */
  onOpenGithub?: () => void
  /** Called on Cancel while signing in. */
  onCancel?: () => void
  /** Classes for the root. */
  className?: string
}

/**
 * Whether the app can open and merge pull requests: who `gh` is signed in
 * as, or a Sign in button.
 *
 * Signed in, it names the account and the protocol it pushes over. Signed
 * out, it says what signing in is for, with Sign in. While `gh auth login`
 * runs it shows the one-time code large, with a copy button, and Open
 * GitHub, which opens the device page to paste it into; a spinner waits for
 * you to authorize there, and Cancel stops it. A failed sign-in says why
 * above Sign in. Unframed: it sits in a settings row, a card or an
 * onboarding step.
 *
 * @example {@include ./examples.mdx}
 */
export default function GithubStatus({
  status,
  signingIn = false,
  code,
  error,
  onSignIn,
  onOpenGithub,
  onCancel,
  className,
}: GithubStatusProps) {
  if (signingIn)
    return (
      <div className={cn('flex flex-col gap-3', className)}>
        {code ? (
          <>
            <p className="text-body text-foreground">Enter this code on GitHub:</p>
            <div className="flex items-center gap-2">
              <span className="font-mono text-display text-foreground tabular-nums">{code}</span>
              <Copy variant="glyph" value={code} aria-label="Copy the code" />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button size="compact" trailingIcon={ArrowUpRight} onClick={onOpenGithub}>
                Open GitHub
              </Button>
              <Button variant="ghost" size="compact" onClick={onCancel}>
                Cancel
              </Button>
            </div>
            <p role="status" className="flex items-center gap-2 text-caption text-muted-foreground">
              <Spinner className="size-3.5" />
              Waiting for you to authorize the app on GitHub…
            </p>
          </>
        ) : (
          <p role="status" className="flex items-center gap-2 text-body text-muted-foreground">
            <Spinner className="size-3.5" />
            Starting gh auth login…
          </p>
        )}
      </div>
    )

  if (!status) return <Skeleton className={cn('h-5 w-48', className)} />

  if (status.loggedIn)
    return (
      <p className={cn('flex items-center gap-2 text-body text-foreground', className)}>
        <StatusDot status="success" />
        <span className="min-w-0 truncate">
          Signed in as <span className="weight-semibold">{status.user ?? 'an unknown account'}</span>
        </span>
        {status.protocol && <span className="shrink-0 text-caption text-muted-foreground">{status.protocol}</span>}
      </p>
    )

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <p className="text-body text-muted-foreground">
        Not signed in. Sign in to GitHub so fixes can open pull requests and you can merge them from here.
      </p>
      {error && <p className="text-caption weight-medium text-destructive">{error}</p>}
      <div>
        <Button variant="secondary" size="compact" leadingIcon={LogIn} onClick={onSignIn}>
          Sign in
        </Button>
      </div>
    </div>
  )
}

export type { GithubStatusProps }
export { GithubStatus }
