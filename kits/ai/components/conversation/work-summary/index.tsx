/*!
 * Local addition (not part of Fluid Functionalism): an AI turn's work folded
 * to one row ("Worked for 52s · 4 tool calls") on an Accordion, with a
 * provider that opens every fold at once. Generalised from the AI app's
 * transcript.
 */

'use client'

import Accordion from '@justanarthur/modo-ui/components/containers/accordion'
import { Spinner } from '@justanarthur/modo-ui/components/feedback/progress'
import { createContext, type ReactNode, useContext, useState } from 'react'
import { useFoldBody } from '../../../lib/fold-body'

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

/** One fold; remounted when the show-work toggle flips, so every fold snaps to it at once. */
function WorkFold({
  summary,
  detail,
  running = false,
  defaultOpen,
  children,
}: WorkSummaryProps & { defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  const body = useFoldBody(open)
  return (
    <Accordion
      type="single"
      collapsible
      value={open ? 'work' : ''}
      onValueChange={(value: string) => setOpen(value === 'work')}
      size="compact"
      className="-mx-2.5 w-auto max-w-none"
    >
      <Accordion.Item value="work">
        <Accordion.Trigger className="[&>span:first-child]:min-w-0">
          <span className="flex min-w-0 items-center gap-2">
            {running && <Spinner className="size-3.5" />}
            <span className="shrink-0">{summary}</span>
            {detail && <span className="min-w-0 truncate weight-normal text-muted-foreground">{detail}</span>}
          </span>
        </Accordion.Trigger>
        <Accordion.Content>
          {body && (
            <div className="flex flex-col gap-2 border-l border-border pb-1 pl-[var(--space-3)]">{children}</div>
          )}
        </Accordion.Content>
      </Accordion.Item>
    </Accordion>
  )
}

/**
 * What an AI did on the way to a reply, folded to one row: "Worked for 52s ·
 * 4 tool calls".
 *
 * The reasoning, tool calls and agent runs of a turn go inside, so the
 * conversation reads as what was asked and what came out. Press the row and
 * the work morphs out of it behind a hairline; while the turn runs, the
 * Spinner turns in the row. Wrap the conversation in a `WorkSummary.Provider`
 * to open or fold every turn's work at once, a "show work" toggle. A folded
 * turn's work isn't rendered: it mounts as the fold opens and unmounts once
 * it has closed, so a long conversation carries only what is open.
 *
 * Statics:
 * - `WorkSummary.Provider` — opens every fold inside: `open`.
 *
 * @example {@include ./examples.mdx}
 */
const WorkSummary = Object.assign(
  function WorkSummary(props: WorkSummaryProps) {
    const showWork = useContext(ShowWorkContext)
    return <WorkFold key={String(showWork)} defaultOpen={showWork} {...props} />
  },
  { Provider: WorkSummaryProvider },
)

export type { WorkSummaryProps, WorkSummaryProviderProps }
export { WorkSummary, WorkSummaryProvider }

export default WorkSummary
