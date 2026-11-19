/*!
 * Local addition: the side pane for a fix run's pull request, read from
 * `standards pr view`: its state and review, its checks, what it changes and
 * its description, and the actions that merge it, open it on GitHub or read
 * it again. Presentational: the PR and the callbacks come in as props.
 */

'use client'

import Button from '@justanarthur/modo-ui/components/actions/button'
import ButtonGroup from '@justanarthur/modo-ui/components/actions/button-group'
import Badge, { type BadgeColor } from '@justanarthur/modo-ui/components/data-display/badge'
import Markdown from '@justanarthur/modo-ui/components/data-display/markdown'
import StatusDot from '@justanarthur/modo-ui/components/feedback/status-dot'
import Dropdown from '@justanarthur/modo-ui/components/overlays/dropdown'
import Tooltip from '@justanarthur/modo-ui/components/overlays/tooltip'
import { useControllableState } from '@justanarthur/modo-ui/lib/use-controllable-state'
import { cn } from '@justanarthur/modo-ui/lib/utils'
import Skeleton from '@justanarthur/modo-ui/primitives/content/skeleton'
import { ArrowUpRight, CircleAlert, GitMerge, RotateCw } from 'lucide-react'
import { plural } from '../../components/runs/format'
import type { MergeMethod, PullRequest, PullRequestCheck } from '../../lib/types'
import { CloseButton, PANE, PaneHeader, PaneSection as Section } from '../pane'

type Verdict = 'pass' | 'fail' | 'pending' | 'skipped'

const FAILED = ['FAILURE', 'ERROR', 'TIMED_OUT', 'CANCELLED', 'ACTION_REQUIRED', 'STARTUP_FAILURE']
const SKIPPED = ['NEUTRAL', 'SKIPPED', 'STALE']

/** A check run's conclusion, else a status context's state. */
function verdict({ state, conclusion }: PullRequestCheck): Verdict {
  const word = conclusion || state
  if (word === 'SUCCESS') return 'pass'
  if (FAILED.includes(word)) return 'fail'
  if (SKIPPED.includes(word)) return 'skipped'
  return 'pending'
}

const CHECK: Record<Verdict, { status: 'success' | 'error' | 'running' | 'idle'; label: string }> = {
  pass: { status: 'success', label: 'Passed' },
  fail: { status: 'error', label: 'Failed' },
  pending: { status: 'running', label: 'Running' },
  skipped: { status: 'idle', label: 'Skipped' },
}

const METHODS: { value: MergeMethod; label: string }[] = [
  { value: 'squash', label: 'Squash and merge' },
  { value: 'merge', label: 'Create a merge commit' },
  { value: 'rebase', label: 'Rebase and merge' },
]

const REVIEW: Record<string, string> = {
  APPROVED: 'Approved',
  CHANGES_REQUESTED: 'Changes requested',
  REVIEW_REQUIRED: 'Review required',
}

function stateOf(pr: PullRequest): { label: string; color: BadgeColor } {
  if (pr.state === 'MERGED') return { label: 'Merged', color: 'violet' }
  if (pr.state === 'CLOSED') return { label: 'Closed', color: 'red' }
  if (pr.isDraft) return { label: 'Draft', color: 'gray' }
  return { label: 'Open', color: 'green' }
}

/** Why it can't be merged from here, or nothing when it can. */
function blocker(pr: PullRequest, failing: number) {
  if (pr.isDraft) return 'It is a draft: mark it ready for review on GitHub first.'
  if (pr.mergeable === 'CONFLICTING') return 'It conflicts with the base branch: resolve the conflicts first.'
  if (failing) return `${plural(failing, 'check')} failing: fix ${failing === 1 ? 'it' : 'them'} first.`
  if (pr.mergeStateStatus === 'BLOCKED') return 'Branch protection blocks it: a required review or check is missing.'
  return undefined
}

/** `+12 −3`, each side in its hue. */
function Lines({ additions, deletions }: { additions: number; deletions: number }) {
  return (
    <span className="shrink-0 font-mono text-caption tabular-nums">
      <span className="text-status-success">+{additions}</span> <span className="text-status-error">−{deletions}</span>
    </span>
  )
}

function Loading({ onClose, className }: { onClose?: () => void; className?: string }) {
  return (
    <div className={cn(PANE, className)} aria-busy="true">
      <div className="flex items-start gap-3">
        <div className="flex flex-1 flex-col gap-2">
          <Skeleton className="h-5 w-4/5" />
          <Skeleton className="h-4 w-2/5" />
        </div>
        <CloseButton onClose={onClose} />
      </div>
      <Skeleton className="h-7 w-3/5" />
      <Skeleton rows={3} />
      <Skeleton rows={2} />
    </div>
  )
}

interface PrDetailProps {
  /** The PR as `standards pr view` prints it. Left out while it loads: the pane shows its skeleton. */
  pr?: PullRequest
  /** The merge method Merge uses (controlled). Pair with `onMethodChange`. */
  method?: MergeMethod
  /** The method picked at first, for an uncontrolled pane. Defaults to `'squash'`. */
  defaultMethod?: MergeMethod
  /** Called with the method picked from Merge's menu. */
  onMethodChange?: (method: MergeMethod) => void
  /** Called with the picked method on Merge. */
  onMerge?: (method: MergeMethod) => void
  /** The merge is under way: Merge spins. Defaults to `false`. */
  merging?: boolean
  /** Called on Re-check. */
  onRecheck?: () => void
  /** The PR is being read again: Re-check spins. Defaults to `false`. */
  rechecking?: boolean
  /** Called on the close button. Without it there is none. */
  onClose?: () => void
  /** Classes for the root. */
  className?: string
}

/**
 * A fix run's pull request, for the side pane the run opens once it ends in
 * one: whether it is ready, and the one press that merges it.
 *
 * The head names the PR and its number, its state (open, draft, merged,
 * closed) and its review decision. Merge ▾ merges with the method picked on
 * its chevron (squash, a merge commit, rebase), Open on GitHub opens the PR,
 * and Re-check (the arrow at the row's end) reads it again. Merge stays disabled while the PR can't go in,
 * with the reason under it: a draft, a conflict with the base branch, a
 * failing check, or branch protection. Then the checks with a glyph each
 * (passed, failed, running, skipped), what it changes (lines added and
 * removed, file by file) and its description as Markdown.
 *
 * A merged PR says so in place of Merge: the run's worktree is removed and
 * its branch deleted. Until `pr` arrives the pane shows a skeleton. Works
 * controlled (`method` + `onMethodChange`) or uncontrolled (`defaultMethod`).
 *
 * @example {@include ./examples.mdx}
 */
export default function PrDetail({
  pr,
  method: methodProp,
  defaultMethod = 'squash',
  onMethodChange,
  onMerge,
  merging = false,
  onRecheck,
  rechecking = false,
  onClose,
  className,
}: PrDetailProps) {
  const [method, setMethod] = useControllableState(methodProp, defaultMethod, onMethodChange)
  if (!pr) return <Loading onClose={onClose} className={className} />

  const verdicts = pr.checks.map(verdict)
  const failing = verdicts.filter(v => v === 'fail').length
  const passed = verdicts.filter(v => v === 'pass').length
  const pending = verdicts.filter(v => v === 'pending').length
  const reason = blocker(pr, failing)
  const state = stateOf(pr)
  const methodIndex = METHODS.findIndex(m => m.value === method)
  const counts = [passed && `${passed} passed`, failing && `${failing} failed`, pending && `${pending} running`]

  return (
    <div className={cn(PANE, className)}>
      <PaneHeader title={pr.title} onClose={onClose}>
        <div className="flex flex-wrap items-center gap-2">
          <Badge size="compact" color={state.color}>
            {state.label}
          </Badge>
          <span className="text-caption text-muted-foreground">
            {[`#${pr.number}`, REVIEW[pr.reviewDecision]].filter(Boolean).join(' · ')}
          </span>
        </div>
      </PaneHeader>

      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {pr.state === 'OPEN' && (
            <ButtonGroup size="compact" disabled={Boolean(reason)} aria-label="Merge">
              <ButtonGroup.Button leadingIcon={GitMerge} loading={merging} onClick={() => onMerge?.(method)}>
                {METHODS[methodIndex]?.label ?? 'Merge'}
              </ButtonGroup.Button>
              <ButtonGroup.Menu
                label="Merge method"
                checkedIndex={methodIndex}
                onCheckedIndexChange={next => next !== undefined && setMethod(METHODS[next]!.value)}
              >
                <Dropdown.Label>Merge with</Dropdown.Label>
                {METHODS.map(m => (
                  <Dropdown.Item key={m.value} label={m.label} />
                ))}
              </ButtonGroup.Menu>
            </ButtonGroup>
          )}
          <Button
            variant="secondary"
            size="compact"
            trailingIcon={ArrowUpRight}
            render={<a href={pr.url} target="_blank" rel="noreferrer" />}
          >
            Open on GitHub
          </Button>
          <Tooltip content="Re-check">
            <Button
              variant="ghost"
              size="icon-compact"
              aria-label="Re-check"
              loading={rechecking}
              onClick={onRecheck}
              className="ml-auto"
            >
              <RotateCw />
            </Button>
          </Tooltip>
        </div>
        {pr.state === 'OPEN' && reason && (
          <p className="flex items-start gap-2 text-caption text-muted-foreground">
            <CircleAlert size={14} strokeWidth={1.5} className="mt-px shrink-0 text-status-warning" />
            {reason}
          </p>
        )}
        {pr.state === 'MERGED' && (
          <p className="flex items-start gap-2 text-body text-foreground">
            <StatusDot status="success" className="mt-0.5" />
            Merged. The run's worktree is removed and its branch deleted.
          </p>
        )}
      </div>

      <Section title="Checks" aside={counts.filter(Boolean).join(' · ') || undefined}>
        {pr.checks.length ? (
          <ul className="m-0 flex list-none flex-col p-0">
            {pr.checks.map((check, index) => {
              const shown = CHECK[verdicts[index]!]
              return (
                <li key={check.name} className="flex h-8 items-center gap-2 border-border border-b last:border-b-0">
                  <StatusDot status={shown.status} label={shown.label} />
                  <span className="min-w-0 flex-1 truncate text-body text-foreground">{check.name}</span>
                  <span className="shrink-0 text-caption text-muted-foreground">{shown.label}</span>
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="text-body text-muted-foreground">No checks on this PR.</p>
        )}
      </Section>

      <Section title="Changes" aside={<Lines additions={pr.additions} deletions={pr.deletions} />}>
        <ul className="m-0 flex list-none flex-col p-0">
          {pr.files.map(file => (
            <li key={file.path} className="flex h-8 items-center gap-3 border-border border-b last:border-b-0">
              <span className="min-w-0 flex-1 truncate font-mono text-caption text-foreground" title={file.path}>
                {file.path}
              </span>
              <Lines additions={file.additions} deletions={file.deletions} />
            </li>
          ))}
        </ul>
        {pr.changedFiles > pr.files.length && (
          <p className="text-caption text-muted-foreground">
            {plural(pr.changedFiles - pr.files.length, 'more file')} on GitHub.
          </p>
        )}
      </Section>

      <Section title="Description">
        {pr.body.trim() ? (
          <Markdown>{pr.body}</Markdown>
        ) : (
          <p className="text-body text-muted-foreground">No description.</p>
        )}
      </Section>
    </div>
  )
}

export type { PrDetailProps }
export { PrDetail }
