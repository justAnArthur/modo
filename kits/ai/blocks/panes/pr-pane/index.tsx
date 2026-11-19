/*!
 * Local addition: the side pane's Pull request — the session's PR with its
 * CI checks, review comments, auto-fix and the merge.
 */

'use client'

import Button from '@justanarthur/modo-ui/components/actions/button'
import Accordion from '@justanarthur/modo-ui/components/containers/accordion'
import Badge from '@justanarthur/modo-ui/components/data-display/badge'
import Switch from '@justanarthur/modo-ui/components/inputs/switch'
import Code from '@justanarthur/modo-ui/primitives/content/code'
import { useIcon } from '../../../lib/icons'
import { IconAction, PaneSection } from '../../../lib/pane-parts'
import type { PaneCheck, PanePullRequest } from '../../../lib/side-pane-types'
import { RunningGlyph } from '../../../lib/status-glyph'

function CheckGlyph({ status }: { status: PaneCheck['status'] }) {
  const Done = useIcon('circle-check')
  const Failed = useIcon('circle-x')
  if (status === 'running') return <RunningGlyph size={14} />
  if (status === 'success') return <Done size={14} strokeWidth={1.5} className="shrink-0 text-status-success" />
  return <Failed size={14} strokeWidth={1.5} className="shrink-0 text-status-error" />
}

function CheckItem({
  check,
  index,
  onOpenLog,
  onFix,
}: {
  check: PaneCheck
  index: number
  onOpenLog?: (check: PaneCheck) => void
  onFix?: (check: PaneCheck) => void
}) {
  const Fix = useIcon('wrench')
  const Open = useIcon('external-link')
  return (
    <Accordion.Item value={check.name} index={index}>
      <Accordion.Trigger className="px-2">
        <span className="flex min-w-0 items-center gap-2">
          <CheckGlyph status={check.status} />
          <span className="shrink-0">{check.name}</span>
          <span className="min-w-0 flex-1 truncate text-right text-caption weight-normal text-muted-foreground">
            {check.detail}
          </span>
        </span>
      </Accordion.Trigger>
      <Accordion.Content>
        <div className="flex flex-col gap-2">
          <Code language="plaintext">{check.log}</Code>
          <div className="flex items-center justify-end gap-1">
            <Button variant="ghost" size="compact" trailingIcon={Open} onClick={() => onOpenLog?.(check)}>
              Full log
            </Button>
            {check.status === 'failed' && (
              <Button variant="secondary" size="compact" leadingIcon={Fix} onClick={() => onFix?.(check)}>
                Ask Claude to fix
              </Button>
            )}
          </div>
        </div>
      </Accordion.Content>
    </Accordion.Item>
  )
}

interface PullRequestPaneProps {
  /** The pull request: number, title, branches, its checks and its review comments. */
  pr: PanePullRequest
  /** Whether auto-fix starts on. Defaults to `true`. */
  defaultAutoFix?: boolean
  /** Called with the new state whenever auto-fix is toggled. */
  onAutoFixChange?: (on: boolean) => void
  /** Called by Re-run failed. */
  onRerun?: () => void
  /** Called by a check's Full log. */
  onOpenLog?: (check: PaneCheck) => void
  /** Called by a failed check's Ask Claude to fix. */
  onFix?: (check: PaneCheck) => void
  /** Called by GitHub. */
  onOpenOnGitHub?: () => void
  /** Called by Merge, which waits while a check fails. */
  onMerge?: () => void
}

/**
 * The session's pull request: its CI checks as they run, its review
 * comments and the merge.
 *
 * Each check opens to the tail of its log; a failed one starts open, with
 * Ask Claude to fix beside Full log, and the merge waits while one fails.
 * Auto-fix lets the session watch CI, fix failures and answer reviews on
 * its own.
 *
 * @example {@include ./examples.mdx}
 */
export default function PullRequestPane({
  pr,
  defaultAutoFix = true,
  onAutoFixChange,
  onRerun,
  onOpenLog,
  onFix,
  onOpenOnGitHub,
  onMerge,
}: PullRequestPaneProps) {
  const Open = useIcon('external-link')
  const Rerun = useIcon('rotate-ccw')
  const Icon = useIcon('git-pull-request')
  const passed = pr.checks.filter(c => c.status === 'success').length
  const failing = pr.checks.filter(c => c.status === 'failed').length

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-1 px-2 pt-2">
        <div className="flex items-start gap-2">
          <Icon size={16} strokeWidth={1.5} className="mt-0.5 shrink-0 text-muted-foreground" />
          <span className="min-w-0 flex-1 text-body weight-medium text-foreground">{pr.title}</span>
        </div>
        <div className="flex min-w-0 items-center gap-2 pl-6 text-caption text-muted-foreground">
          <Badge size="compact" color="green" className="shrink-0">
            Open
          </Badge>
          <span className="shrink-0 tabular-nums">#{pr.number}</span>
          <span className="min-w-0 truncate font-mono">
            {pr.branch} → {pr.base}
          </span>
        </div>
      </div>

      <PaneSection
        title="Checks"
        meta={`${passed} of ${pr.checks.length} passed`}
        actions={<IconAction icon={Rerun} label="Re-run failed" onClick={onRerun} />}
      >
        <Accordion.Group
          type="multiple"
          highlight="trigger"
          defaultValue={pr.checks.filter(c => c.status === 'failed').map(c => c.name)}
          className="w-full max-w-none"
        >
          {pr.checks.map((check, i) => (
            <CheckItem key={check.name} check={check} index={i} onOpenLog={onOpenLog} onFix={onFix} />
          ))}
        </Accordion.Group>
      </PaneSection>

      <PaneSection title="Reviews" meta={`${pr.reviews.length} comments`}>
        <ul className="m-0 flex list-none flex-col gap-2 p-0 px-2 pb-1">
          {pr.reviews.map((review, i) => (
            <li key={`${i}:${review.where}`} className="flex min-w-0 flex-col">
              <span className="flex min-w-0 gap-2 text-caption text-muted-foreground">
                <span className="shrink-0 weight-medium text-foreground">{review.author}</span>
                <span className="min-w-0 truncate font-mono">{review.where}</span>
              </span>
              <span className="text-body text-foreground">{review.body}</span>
            </li>
          ))}
        </ul>
      </PaneSection>

      <div>
        <Switch
          trackSide="end"
          label="Auto-fix"
          description="Watch CI, fix failures and answer review comments in this session"
          defaultChecked={defaultAutoFix}
          onCheckedChange={onAutoFixChange}
        />
      </div>

      <div className="flex items-center gap-2 px-2 pt-2">
        <span className="min-w-0 flex-1 truncate text-caption text-muted-foreground">
          {failing > 0 ? `${failing} failing check blocks the merge` : 'Ready to merge'}
        </span>
        <Button variant="tertiary" size="compact" trailingIcon={Open} onClick={onOpenOnGitHub}>
          GitHub
        </Button>
        <Button size="compact" disabled={failing > 0} onClick={onMerge}>
          Merge
        </Button>
      </div>
    </div>
  )
}

export type { PullRequestPaneProps }

export { PullRequestPane }
