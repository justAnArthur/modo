/*!
 * Local addition: a cell's checks and fix runs on one timeline, newest
 * first, each row opening what that run did.
 */

'use client'

import { cn } from '@justanarthur/modo-ui/lib/utils'
import FluidHover from '@justanarthur/modo-ui/primitives/systems/fluid-hover'
import { ChevronRight } from 'lucide-react'
import { ago } from '../../../lib/cells'
import type { FixRun, Result, ShownState } from '../../../lib/types'
import StateCell from '../../status/state-cell'
import { duration } from '../format'

const CHECK_TITLE: Record<Result['state'], string> = {
  pass: 'Check passed',
  fail: 'Check failed',
  error: "Couldn't check",
}

const FIX_GLYPH: Record<FixRun['state'], ShownState> = {
  running: 'running',
  done: 'pr-open',
  failed: 'error',
  stopped: 'unchecked',
}

/** `PR #24 merged · 6m 12s`, `running for 4m`. */
function fixLine(run: FixRun, now: number) {
  const time = duration(run.ms ?? now - Date.parse(run.started_at))
  if (run.state === 'running') return `${run.model} · running for ${time}`
  const outcome = run.pr ? `PR #${run.pr.number} ${run.pr.state}` : run.state
  return `${run.model} · ${outcome} · ${time}`
}

interface Entry {
  id: string
  at: string
  glyph: ShownState
  worker?: string
  title: string
  line: string
  mono: boolean
}

function entries(checks: Result[], fixes: FixRun[], now: number): Entry[] {
  const fromChecks = checks.map(check => ({
    id: check.checked_at,
    at: check.checked_at,
    glyph: check.state,
    title: CHECK_TITLE[check.state],
    line: check.evidence,
    mono: true,
  }))
  const fromFixes = fixes.map(run => ({
    id: run.id,
    at: run.started_at,
    glyph: FIX_GLYPH[run.state],
    worker: run.worker,
    title: `Fix by ${run.worker}`,
    line: fixLine(run, now),
    mono: false,
  }))
  return [...fromChecks, ...fromFixes].sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
}

interface RunTimelineProps {
  /** The cell's checks, as results. */
  checks: Result[]
  /** The cell's fix runs. Defaults to none. */
  fixes?: FixRun[]
  /** The time "12m ago" counts from, in epoch ms. Defaults to now. */
  now?: number
  /** Called with the entry's id on a press: a check's `checked_at`, a fix run's `id`. */
  onOpen?: (id: string) => void
  /** Classes for the list. */
  className?: string
}

/**
 * Everything that happened to a cell, newest first: each check with its
 * verdict and evidence, and each fix run with its worker, model, outcome and
 * time.
 *
 * Checks and fix runs wear the grid's glyphs (see StateCell): a check its
 * verdict, a running fix its worker's initials, a finished one its PR. Every
 * row opens the same way, to the check's log or the run's transcript, under
 * one fluid hover highlight.
 *
 * @example {@include ./examples.mdx}
 */
export default function RunTimeline({ checks, fixes = [], now = Date.now(), onOpen, className }: RunTimelineProps) {
  return (
    <FluidHover className={cn('-mx-2 gap-0', className)}>
      {entries(checks, fixes, now).map(entry => (
        <FluidHover.Item
          key={entry.id}
          onClick={() => onOpen?.(entry.id)}
          className="h-auto items-start gap-3 px-2 py-2"
        >
          <StateCell.Glyph state={entry.glyph} worker={entry.worker} size="small" className="mt-0.5" />
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="flex items-baseline justify-between gap-3">
              <span className="truncate text-body text-foreground">{entry.title}</span>
              <span className="shrink-0 text-caption text-muted-foreground">{ago(entry.at, now)}</span>
            </span>
            <span className={cn('truncate text-caption text-muted-foreground', entry.mono && 'font-mono')}>
              {entry.line}
            </span>
          </span>
          <ChevronRight strokeWidth={1.5} className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
        </FluidHover.Item>
      ))}
    </FluidHover>
  )
}

export type { RunTimelineProps }
export { RunTimeline }
