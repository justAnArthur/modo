/*!
 * Local addition (not part of Fluid Functionalism): an AI turn's work folded
 * to one row ("Worked for 52s · 4 tool calls") on an Accordion, with a
 * provider that opens every fold at once. Generalised from the AI app's
 * transcript.
 */

'use client'

import { createContext, type ReactNode, useContext } from 'react'
import Accordion from '../../accordion'
import Spinner from '../../spinner'

const ShowWorkContext = createContext(false)

interface WorkSummaryProviderProps {
  /** Unfold every `WorkSummary` inside; switching it re-folds or re-opens them all. */
  open: boolean
  /** The conversation. */
  children: ReactNode
}

/** Opens or folds every WorkSummary inside at once: a "show work" toggle. */
function WorkSummaryProvider({ open, children }: WorkSummaryProviderProps) {
  return <ShowWorkContext.Provider value={open}>{children}</ShowWorkContext.Provider>
}

interface WorkSummaryProps {
  /** How long the turn worked: `"Worked for 52s"`, `"Working…"`. */
  summary: string
  /** What it did, in a few words: `"4 tool calls · 1 agent"`. */
  detail?: string
  /** Still working: the Spinner turns in the row. Defaults to `false`. */
  running?: boolean
  /** The reasoning, tool calls and agent runs. */
  children: ReactNode
}

/**
 * What an AI did on the way to a reply, folded to one row: "Worked for 52s ·
 * 4 tool calls".
 *
 * The reasoning, tool calls and agent runs of a turn go inside, so the
 * conversation reads as what was asked and what came out. Press the row and
 * the work morphs out of it behind a hairline; while the turn runs, the
 * Spinner turns in the row. Wrap the conversation in a `WorkSummary.Provider`
 * to open or fold every turn's work at once, a "show work" toggle.
 *
 * Statics:
 * - `WorkSummary.Provider` — opens every fold inside: `open`.
 *
 * @example {@include ./examples.mdx}
 */
function WorkSummary({ summary, detail, running = false, children }: WorkSummaryProps) {
  const showWork = useContext(ShowWorkContext)
  return (
    <Accordion
      key={String(showWork)}
      type="single"
      collapsible
      defaultValue={showWork ? 'work' : undefined}
      size="compact"
      className="-mx-2.5 w-auto max-w-none"
    >
      <Accordion.Item value="work">
        <Accordion.Trigger className="[&>span:first-child]:min-w-0">
          <span className="flex min-w-0 items-center gap-2">
            {running && <Spinner size={14} />}
            <span className="shrink-0">{summary}</span>
            {detail && <span className="min-w-0 truncate weight-normal text-muted-foreground">{detail}</span>}
          </span>
        </Accordion.Trigger>
        <Accordion.Content>
          <div className="flex flex-col gap-2 border-l border-border pb-1 pl-[var(--space-3)]">{children}</div>
        </Accordion.Content>
      </Accordion.Item>
    </Accordion>
  )
}

WorkSummary.Provider = WorkSummaryProvider

export type { WorkSummaryProps, WorkSummaryProviderProps }
export { WorkSummary, WorkSummaryProvider }

export default WorkSummary
