/*!
 * Local addition: a turn's work folded to one row — thinking, tool calls and
 * agent runs behind "Worked for 52s · 4 tool calls", so the transcript reads
 * as what was asked and what came out. The transcript's "Show work" toggle
 * opens every fold at once.
 */

'use client'

import { createContext, type ReactNode, useContext } from 'react'
import Accordion from '../../../components/accordion'
import { RunningGlyph } from '../status-glyph'

export const ShowWorkContext = createContext(false)

export interface WorkProps {
  /** How long the turn worked: `"Worked for 52s"`, `"Working…"`. */
  summary: string
  /** What it did, in a few words: `"4 tool calls · 1 agent"`. */
  detail?: string
  /** Still working: the arc turns in the row. Defaults to `false`. */
  running?: boolean
  /** The thinking, tool calls and agent runs. */
  children: ReactNode
}

/** A turn's work, folded to one row; the transcript's toggle or a press opens it. */
export function Work({ summary, detail, running = false, children }: WorkProps) {
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
            {running && <RunningGlyph size={14} />}
            <span className="shrink-0">{summary}</span>
            {detail && <span className="min-w-0 truncate weight-normal text-muted-foreground">{detail}</span>}
          </span>
        </Accordion.Trigger>
        <Accordion.Content>
          <div className="flex flex-col gap-2 border-l border-border pb-1 pl-3 ml-2.5">{children}</div>
        </Accordion.Content>
      </Accordion.Item>
    </Accordion>
  )
}
