/*!
 * Local addition: the drawer for one cell of the standards grid: its state
 * and evidence, the item's why and check, its timeline of checks and fix
 * runs (each opening to its log or transcript), and the actions that fix,
 * re-check or waive it. Presentational: the cell, its item and asset, the
 * runs, the workers and the callbacks come in as props.
 */

'use client'

import Button from '@justanarthur/modo-ui/components/actions/button'
import Badge from '@justanarthur/modo-ui/components/data-display/badge'
import StatusDot from '@justanarthur/modo-ui/components/feedback/status-dot'
import DatePicker from '@justanarthur/modo-ui/components/inputs/date-time/date-picker'
import Field from '@justanarthur/modo-ui/components/inputs/field'
import Textarea from '@justanarthur/modo-ui/components/inputs/textarea'
import Dropdown from '@justanarthur/modo-ui/components/overlays/dropdown'
import { useControllableState } from '@justanarthur/modo-ui/lib/use-controllable-state'
import { cn } from '@justanarthur/modo-ui/lib/utils'
import Code from '@justanarthur/modo-ui/primitives/content/code'
import { ArrowLeft, ArrowUpRight, Ellipsis, RotateCw, ShieldCheck, ShieldOff, X } from 'lucide-react'
import { type ReactNode, useState } from 'react'
import CheckLog from '../../components/runs/check-log'
import { duration, plural } from '../../components/runs/format'
import RunTimeline from '../../components/runs/run-timeline'
import RunTranscript from '../../components/runs/run-transcript'
import StateCell from '../../components/status/state-cell'
import WorkerPicker from '../../components/workers/worker-picker'
import { adoptedVersion, ago, assetName, shownState, toYaml } from '../../lib/cells'
import { STATE_BADGE, STATE_LABEL } from '../../lib/states'
import type { Asset, Business, CellStatus, FixRun, LoadedItem, LoadedPack, Result, Worker } from '../../lib/types'

const CHECK_KIND: Record<LoadedItem['check']['kind'], string> = {
  http: 'Fetches the site and asserts on what it gets',
  repo: 'Reads files in the local checkout',
  github: 'Asks GitHub about the repo',
  script: 'Runs the item’s check.ts',
  ai: 'Asks a cheap model to judge, read-only',
}

const CHECK_TITLE: Record<Result['state'], string> = {
  pass: 'Check passed',
  fail: 'Check failed',
  error: "Couldn't check",
}

const EVIDENCE = 'break-words rounded-lg bg-muted px-3 py-2 font-mono text-caption text-foreground'

function Section({ title, aside, children }: { title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-subtitle text-foreground">{title}</h3>
        {aside && <span className="text-caption text-muted-foreground">{aside}</span>}
      </div>
      {children}
    </section>
  )
}

function CloseButton({ onClose }: { onClose?: () => void }) {
  if (!onClose) return null
  return (
    <Button variant="ghost" size="icon-compact" aria-label="Close" onClick={onClose}>
      <X />
    </Button>
  )
}

function WaiveForm({ onWaive, onCancel }: { onWaive?: CellDetailProps['onWaive']; onCancel: () => void }) {
  const [reason, setReason] = useState('')
  const [until, setUntil] = useState<string | null>(null)
  return (
    <div className="flex flex-col gap-3">
      <Field>
        <Field.Label>Reason</Field.Label>
        <Textarea
          value={reason}
          onValueChange={setReason}
          minRows={2}
          placeholder="Why this cell doesn't need to pass"
        />
      </Field>
      <Field>
        <Field.Label>Until</Field.Label>
        <DatePicker valueType="string" value={until} onValueChange={setUntil} placeholder="No end date" />
        <Field.Description>The cell counts again from that day.</Field.Description>
      </Field>
      <div className="flex gap-2">
        <Button
          variant="secondary"
          size="compact"
          disabled={!reason.trim()}
          onClick={() => onWaive?.({ reason: reason.trim(), until: until ?? undefined })}
        >
          Waive
        </Button>
        <Button variant="ghost" size="compact" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  )
}

interface RunViewProps {
  title: string
  meta: string
  onBack: () => void
  onClose?: () => void
  /** The body fills the pane and scrolls itself (a transcript), instead of scrolling with the pane. */
  fill: boolean
  children: ReactNode
  className?: string
}

/** One entry of the timeline, opened in the pane: a back control and the run's facts over its log or transcript. */
function RunView({ title, meta, onBack, onClose, fill, children, className }: RunViewProps) {
  return (
    <div className={cn('flex min-h-0 flex-col', className)}>
      <header className="flex shrink-0 items-start gap-2 px-3 pt-4 pb-3">
        <Button variant="ghost" size="icon-compact" aria-label="Back to the cell" onClick={onBack}>
          <ArrowLeft />
        </Button>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5 pt-1">
          <h2 className="truncate text-subtitle text-foreground">{title}</h2>
          <span className="text-caption text-muted-foreground">{meta}</span>
        </div>
        <CloseButton onClose={onClose} />
      </header>
      <div
        className={cn(
          'flex min-h-0 flex-1 flex-col border-border border-t',
          fill ? 'overflow-hidden' : 'gap-4 overflow-y-auto p-5',
        )}
      >
        {children}
      </div>
    </div>
  )
}

/** The PR a fix run opened, pinned under its transcript. */
function PrCard({ pr, branch }: { pr: NonNullable<FixRun['pr']>; branch: string }) {
  return (
    <div className="flex items-center gap-2 border-border border-t pt-3">
      <StateCell.Glyph state="pr-open" size="small" />
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="text-body text-foreground">
          PR #{pr.number} {pr.state}
        </span>
        <span className="truncate font-mono text-caption text-muted-foreground">{branch}</span>
      </div>
      <Button
        variant="secondary"
        size="compact"
        trailingIcon={ArrowUpRight}
        render={<a href={pr.url} target="_blank" rel="noreferrer" />}
      >
        Open
      </Button>
    </div>
  )
}

/** `sonnet · 2d ago · 6m 12s · $0.41`, `sonnet · running for 4m`. */
function fixMeta(run: FixRun, now: number) {
  const time = duration(run.ms ?? now - Date.parse(run.started_at))
  const parts =
    run.state === 'running'
      ? [run.model, `running for ${time}`]
      : [run.model, ago(run.started_at, now), time, run.state === 'done' ? undefined : run.state]
  if (run.cost_usd !== undefined) parts.push(`$${run.cost_usd.toFixed(2)}`)
  return parts.filter(Boolean).join(' · ')
}

interface CellDetailProps {
  /** The cell: its state, last result, waiver and any run under way. */
  cell: CellStatus
  /** The cell's item, with its why and check. */
  item: LoadedItem
  /** The item's pack. */
  pack: LoadedPack
  /** The cell's asset. */
  asset: Asset
  /** The business, for its name, its default worker and the pack version it follows. */
  business: Business
  /** The worker presets for Fix with. */
  workers: Worker[]
  /** The cell's results, newest first, each with its log when the engine recorded one; the first is the last check. Defaults to the last result alone. */
  history?: Result[]
  /** The workers' runs on the cell, each with its transcript. Defaults to none. */
  fixRuns?: FixRun[]
  /** The timeline entry open in the pane (controlled): a check's `checked_at` or a fix run's `id`, `null` for the cell itself. Pair with `onRunChange`. */
  run?: string | null
  /** The entry open at first, for an uncontrolled pane. Defaults to `null`. */
  defaultRun?: string | null
  /** Called with the entry opened from the timeline, or `null` on Back. */
  onRunChange?: (run: string | null) => void
  /** The time "12m ago" counts from, in epoch ms. Defaults to now. */
  now?: number
  /** Called with the picked worker's id on Fix. */
  onFix?: (worker: string) => void
  /** Called on Re-check. */
  onRecheck?: () => void
  /** Called with the reason and end date (an ISO date) when the cell is waived. */
  onWaive?: (waiver: { reason: string; until?: string }) => void
  /** Called on Lift waiver, for a waived cell. */
  onLiftWaiver?: () => void
  /** Called on the close button. Without it there is none. */
  onClose?: () => void
  /** Classes for the root. */
  className?: string
}

/**
 * Everything about one cell, for the drawer or side pane the grid opens: what
 * the check found, why the item matters, how it is checked, what has been
 * tried, and what to do about it.
 *
 * The head names the item, the asset and the pack, with the cell's state.
 * Work under way shows first: the worker on it, or the PR open until the
 * check passes. Then the evidence as the check wrote it, the item's why, the
 * check written out as in its `item.yml`, and the history: one timeline of
 * the cell's checks and fix runs (see RunTimeline). Press an entry and the
 * pane turns to it, with a back control: a check's log, step by step (see
 * CheckLog), or a fix run's Claude Code session ending in its PR (see
 * RunTranscript). An ai check's log is its model's session, in the same view.
 *
 * The actions stay on one row and follow the state: a failing cell gets Fix
 * with ▾ worker (the business's default first, see WorkerPicker); every cell
 * can be re-checked; the ⋯ menu holds Waive, which opens a reason and an end
 * date in place, or Lift waiver on a waived cell.
 *
 * Give the pane a height when a transcript can open in it: the transcript
 * scrolls inside it.
 *
 * @example {@include ./examples.mdx}
 */
export default function CellDetail({
  cell,
  item,
  pack,
  asset,
  business,
  workers,
  history = cell.result ? [cell.result] : [],
  fixRuns = [],
  run: runProp,
  defaultRun = null,
  onRunChange,
  now = Date.now(),
  onFix,
  onRecheck,
  onWaive,
  onLiftWaiver,
  onClose,
  className,
}: CellDetailProps) {
  const [waiving, setWaiving] = useState(false)
  const [open, setOpen] = useControllableState(runProp, defaultRun, onRunChange)
  const state = shownState(cell)
  const { result, run, waiver } = cell

  const check = history.find(entry => entry.checked_at === open)
  if (check) {
    const facts = [ago(check.checked_at, now), duration(check.ms), `v${check.item_version}`, item.check.kind]
    return (
      <RunView
        title={CHECK_TITLE[check.state]}
        meta={facts.join(' · ')}
        onBack={() => setOpen(null)}
        onClose={onClose}
        fill={check.log?.kind === 'ai'}
        className={className}
      >
        {check.log ? (
          <CheckLog log={check.log} />
        ) : (
          <>
            <p className={EVIDENCE}>{check.evidence}</p>
            <p className="text-caption text-muted-foreground">The engine kept no log of this check.</p>
          </>
        )}
      </RunView>
    )
  }

  const fix = fixRuns.find(entry => entry.id === open)
  if (fix)
    return (
      <RunView
        title={`Fix by ${fix.worker}`}
        meta={fixMeta(fix, now)}
        onBack={() => setOpen(null)}
        onClose={onClose}
        fill
        className={className}
      >
        <RunTranscript
          items={fix.transcript}
          running={fix.state === 'running'}
          footer={fix.pr && <PrCard pr={fix.pr} branch={fix.branch} />}
        />
      </RunView>
    )

  const counts = [
    history.length && plural(history.length, 'check'),
    fixRuns.length && plural(fixRuns.length, 'fix run'),
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <div className={cn('flex min-h-0 flex-col gap-6 overflow-y-auto p-5', className)}>
      <header className="flex items-start gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <h2 className="text-title text-foreground">{item.title}</h2>
          <span className="text-caption text-muted-foreground">
            {assetName(asset)} · {business.name} · {pack.title} v{adoptedVersion(business, pack) ?? pack.version}
          </span>
          <div className="flex items-center gap-2 pt-1">
            <StateCell.Glyph state={state} worker={run?.state === 'running' ? run.worker : undefined} />
            <Badge size="compact" color={STATE_BADGE[state]}>
              {STATE_LABEL[state]}
            </Badge>
          </div>
        </div>
        <CloseButton onClose={onClose} />
      </header>

      {run && (
        <div className="flex items-start gap-2 text-body text-foreground">
          <StatusDot status={run.state === 'running' ? 'running' : 'waiting'} className="mt-0.5" />
          {run.state === 'running' ? (
            <span>{run.worker} is on it. The cell turns green once its check passes.</span>
          ) : (
            <span>
              <a href={run.url} className="underline decoration-border underline-offset-4 hover:decoration-foreground">
                PR #{run.number}
              </a>{' '}
              is open. The cell shows it until its check passes.
            </span>
          )}
        </div>
      )}

      <div className="flex items-center gap-2">
        {state === 'fail' && (
          <WorkerPicker
            workers={workers}
            defaultValue={business.worker}
            size="compact"
            onFix={onFix}
            className="min-w-0"
          />
        )}
        <Button variant="secondary" size="compact" leadingIcon={RotateCw} onClick={onRecheck}>
          Re-check
        </Button>
        <Dropdown.Menu>
          <Dropdown.Trigger
            render={
              <Button variant="ghost" size="icon-compact" aria-label="More actions" className="ml-auto">
                <Ellipsis />
              </Button>
            }
          />
          <Dropdown.Content align="end">
            {waiver ? (
              <Dropdown.Item icon={ShieldCheck} label="Lift waiver" onSelect={() => onLiftWaiver?.()} />
            ) : (
              <Dropdown.Item icon={ShieldOff} label="Waive…" onSelect={() => setWaiving(true)} />
            )}
          </Dropdown.Content>
        </Dropdown.Menu>
      </div>

      {waiving && <WaiveForm onWaive={onWaive} onCancel={() => setWaiving(false)} />}

      {waiver && (
        <Section title="Waiver" aside={waiver.until ? `until ${waiver.until}` : 'no end date'}>
          <p className="text-body text-foreground">{waiver.reason}</p>
        </Section>
      )}

      {result && (
        <Section
          title="Evidence"
          aside={`${ago(result.checked_at, now)} · v${result.item_version} · ${duration(result.ms)}`}
        >
          <p className={EVIDENCE}>{result.evidence}</p>
        </Section>
      )}

      <Section title="Why">
        <p className="text-body text-foreground">{item.why}</p>
      </Section>

      <Section title="Check" aside={`${item.check.kind} · v${item.version}`}>
        <p className="text-caption text-muted-foreground">{CHECK_KIND[item.check.kind]}.</p>
        <Code language="yaml">{toYaml(item.check)}</Code>
      </Section>

      <Section title="History" aside={counts || undefined}>
        {counts ? (
          <RunTimeline checks={history} fixes={fixRuns} now={now} onOpen={setOpen} />
        ) : (
          <p className="text-body text-muted-foreground">Not checked yet.</p>
        )}
      </Section>
    </div>
  )
}

export type { CellDetailProps }
export { CellDetail }
