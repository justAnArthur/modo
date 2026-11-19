/*!
 * Local addition: one cell of the standards grid, one asset × one item, as a
 * 24px glyph with a distinct look per state and a hover card with its
 * evidence. Presentational: the cell's status comes in as a prop.
 */

'use client'

import Badge from '@justanarthur/modo-ui/components/data-display/badge'
import { statusGlyph } from '@justanarthur/modo-ui/components/feedback/status-dot'
import PreviewCard from '@justanarthur/modo-ui/components/overlays/preview-card'
import { cn } from '@justanarthur/modo-ui/lib/utils'
import { Check, Clock, GitPullRequest, Minus, X } from 'lucide-react'
import type { MouseEvent } from 'react'
import { ago, initialsOf, shownState } from '../../../lib/cells'
import { STATE_BADGE, STATE_LABEL } from '../../../lib/states'
import type { CellStatus, ShownState } from '../../../lib/types'

// Literal tables: UnoCSS only generates the classes it can read whole.
const LOOK: Record<ShownState, string> = {
  pass: 'bg-success-wash text-success-strong',
  'pass-older': 'border border-success-wash text-success-strong',
  fail: 'bg-destructive-wash text-destructive-strong',
  running: 'bg-status-warning/16 text-foreground',
  'pr-open': 'bg-status-info/16 text-status-info',
  checking: 'bg-status-loading/16 text-foreground',
  error: 'bg-active text-muted-foreground',
  stale: 'border border-dashed border-control text-muted-foreground',
  waived: 'border border-border text-muted-foreground',
  unchecked: 'text-muted-foreground',
}

const BOX = { default: 'size-6', small: 'size-4' }
const ICON = { default: 'size-3.5', small: 'size-2.5' }
const TEXT = { default: 'text-micro', small: 'text-micro-compact' }
const SPIN = { default: 22, small: 15 }

const Spinning = statusGlyph('running')

type GlyphSize = keyof typeof BOX

interface StateGlyphProps {
  /** The state to draw. */
  state: ShownState
  /** The worker's id on a `running` cell: its initials show. */
  worker?: string
  /** The item version a `pass-older` cell passed. Defaults to `1`. */
  version?: number
  /** `small` is the legend's 16px box. Defaults to `'default'`, 24px. */
  size?: GlyphSize
  /** Classes for the box. */
  className?: string
}

function GlyphMark({ state, worker, version = 1, size = 'default' }: StateGlyphProps) {
  const icon = cn(ICON[size], 'stroke-2')
  const text = cn(TEXT[size], 'weight-semibold tabular-nums')
  if (state === 'pass') return <Check className={icon} />
  if (state === 'fail') return <X className={icon} />
  if (state === 'stale') return <Clock className={icon} />
  if (state === 'waived') return <Minus className={icon} />
  if (state === 'pr-open') return <GitPullRequest className={icon} />
  if (state === 'checking') return <Spinning size={SPIN[size]} />
  if (state === 'pass-older') return <span className={text}>v{version}</span>
  if (state === 'running') return <span className={text}>{worker ? initialsOf(worker) : '…'}</span>
  if (state === 'error')
    return <span className={cn(size === 'small' ? 'text-micro' : 'text-caption', 'weight-semibold')}>!</span>
  return <span className="size-2 rounded-full border border-control" />
}

/** The cell's look alone, without the button or the card: for a legend or a summary. */
function StateGlyph({ size = 'default', className, ...props }: StateGlyphProps) {
  return (
    <span
      aria-hidden
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-box',
        BOX[size],
        LOOK[props.state],
        className,
      )}
    >
      <GlyphMark size={size} {...props} />
    </span>
  )
}

function CellCard({ cell, asset, now }: { cell: CellStatus; asset?: string; now: number }) {
  const state = shownState(cell)
  const { result, waiver, run } = cell
  return (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col">
          <span className="text-subtitle weight-semibold text-foreground">{cell.title}</span>
          <span className="truncate text-caption text-muted-foreground">
            {asset ?? cell.asset} · {cell.item}
          </span>
        </div>
        <Badge size="compact" color={STATE_BADGE[state]} className="shrink-0">
          {STATE_LABEL[state]}
        </Badge>
      </div>
      {result && <p className="break-words font-mono text-caption text-foreground">{result.evidence}</p>}
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-caption">
        {cell.checking && (
          <>
            <dt className="text-muted-foreground">Now</dt>
            <dd className="text-foreground">
              {result ? 'Checking again; the last result stands until it lands' : 'Checking for the first time'}
            </dd>
          </>
        )}
        {result && (
          <>
            <dt className="text-muted-foreground">Checked</dt>
            <dd className="text-foreground">
              {ago(result.checked_at, now)} · v{result.item_version}
            </dd>
          </>
        )}
        {run?.state === 'running' && (
          <>
            <dt className="text-muted-foreground">Worker</dt>
            <dd className="text-foreground">{run.worker}</dd>
          </>
        )}
        {run?.state === 'pr-open' && (
          <>
            <dt className="text-muted-foreground">PR</dt>
            <dd className="text-foreground">#{run.number}, open until the check passes</dd>
          </>
        )}
        {waiver && (
          <>
            <dt className="text-muted-foreground">Waived</dt>
            <dd className="text-foreground">
              {waiver.reason}
              {waiver.until && ` · until ${waiver.until}`}
            </dd>
          </>
        )}
        {!result && !waiver && !cell.checking && (
          <>
            <dt className="text-muted-foreground">Checked</dt>
            <dd className="text-foreground">never</dd>
          </>
        )}
      </dl>
    </>
  )
}

interface StateCellProps {
  /** The cell: its state, last result, waiver and any run under way. */
  cell: CellStatus
  /** The asset's name for the card, such as `www.camasys.com`. Defaults to the asset's id. */
  asset?: string
  /** Marks the cell as part of a multi-selection. Defaults to `false`. */
  selected?: boolean
  /** Called on a press, with the event, so a host can tell a ⌘- or Shift-press (select) from a plain one (open). */
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void
  /** The time the card's "12m ago" counts from, in epoch ms. Defaults to now. */
  now?: number
}

/**
 * One asset × one item: a 24px cell with one look per state, readable in a
 * dense grid, and a card with the evidence on hover.
 *
 * A pass is a green check; a fail is red. A check that couldn't run (DNS, a
 * 500, no local path) is a grey `!`, never red. A stale result (older than a
 * week) is a dashed outline with a clock; a pass on an older version of the
 * item is a faint outline marked `v1`; a waived cell is a neutral dash; a
 * cell nobody has checked yet is a hollow dot. Work under way wins over the
 * check: a worker on the cell shows its initials on amber, an open PR its
 * mark on blue, until the check passes. A check running right now wins over
 * both: modo-ui's spinner on a grey wash, calm next to the amber of a worker,
 * while the cell keeps its last result for the card (see `checking` on
 * CellStatus).
 *
 * Hover (or focus) the cell and its card oozes out (see PreviewCard): the
 * item, the asset, the evidence as the check wrote it, when it was checked,
 * and the waiver or run. A press calls `onClick` with the event, so the grid
 * opens the cell's drawer on a plain press and selects on a ⌘- or
 * Shift-press.
 *
 * Statics:
 * - `StateCell.Glyph` — the look alone, for a legend: `state`, `worker`,
 *   `version`, `size` (`small` is 16px).
 *
 * @example {@include ./examples.mdx}
 */
const StateCell = Object.assign(
  function StateCell({ cell, asset, selected = false, onClick, now = Date.now() }: StateCellProps) {
    const state = shownState(cell)
    const last = cell.checking ? `, last ${STATE_LABEL[cell.run?.state ?? cell.state]}` : ''
    return (
      <PreviewCard>
        <PreviewCard.Trigger
          delay={250}
          closeDelay={100}
          aria-label={`${cell.title}: ${STATE_LABEL[state]}${last}${selected ? ', selected' : ''}`}
          render={
            <button
              type="button"
              onClick={onClick}
              className={cn(
                'inline-flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-box outline-none',
                'transition-[box-shadow] duration-fast hover:ring-1 hover:ring-control focus-visible:ring-1 focus-visible:ring-focus-ring',
                LOOK[state],
                selected && 'ring-1 ring-brand ring-offset-1 ring-offset-background hover:ring-brand',
              )}
            />
          }
        >
          <GlyphMark
            state={state}
            worker={cell.run?.state === 'running' ? cell.run.worker : undefined}
            version={cell.result?.item_version}
          />
        </PreviewCard.Trigger>
        <PreviewCard.Content className="w-80">
          <CellCard cell={cell} asset={asset} now={now} />
        </PreviewCard.Content>
      </PreviewCard>
    )
  },
  { Glyph: StateGlyph },
)

export type { GlyphSize, StateCellProps, StateGlyphProps }
export { StateCell, StateGlyph }

export default StateCell
