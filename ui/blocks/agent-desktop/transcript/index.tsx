/*!
 * Local addition: the agent desktop's transcript. A scrolling reading column
 * for one session, with the chapter list floating in its corner; the parts
 * (messages, thinking, tool calls, agent runs, chapters, the task list and
 * the wrap-up box) hang off it as statics and live in the files beside it.
 */

'use client'

import { type ReactNode, useLayoutEffect, useRef, useState } from 'react'
import Button from '../../../components/button'
import { useIcon } from '../../../lib/icon-context'
import { cn } from '../../../lib/utils'
import ScrollArea from '../../../primitives/scroll-area'
import { AssistantMessage, Attachment, Chapter, Mention, Thinking, UserMessage, Working } from './messages'
import { Toc, type TocChapter } from './toc'
import { AgentRun, Tool, Tools } from './tools'
import { NextStep, TaskList } from './turn'
import { ShowWorkContext, Work } from './work'

interface TranscriptProps {
  /** The turns: `Transcript.User`, `Transcript.Assistant` and the parts below. */
  children: ReactNode
  /** The session's chapters, for the chapter list in the corner. Omit for no list. */
  chapters?: TocChapter[]
  /** Start with every turn's work unfolded. Defaults to `false`. */
  defaultShowWork?: boolean
  /** Pinned under the column, outside the scroll: the task list, a prompt, the next-step box. */
  footer?: ReactNode
  /** Classes for the root. */
  className?: string
}

/**
 * One session's conversation: what you asked, what the agent said and did,
 * and where the turn left off.
 *
 * The turns sit in one reading column. Your messages are bubbles on the
 * right, with attachments, pasted text and @-mentions; the agent's replies
 * are markdown on the page. What the agent did on the way (thinking, tool
 * calls, agent runs) folds into one row per turn, "Worked for 52s · 4 tool
 * calls", so the output reads clean; press the row to open it, or the eye
 * in the corner to show every turn's work at once. Inside, a run of
 * tool calls shares one hover highlight, and each call (Bash, Read, Edit
 * with its diff, Write, Grep…) opens in place to show its output; a
 * subagent or background agent run is a framed card with its own calls.
 * Chapters break the column with a titled hairline, and the chapter list in
 * the corner jumps between them. The `footer` stays put under the column:
 * that is where the task list, a pending prompt and the next-step box live.
 *
 * Statics:
 * - `Transcript.User` — your turn: `attachments`, children with `Transcript.Mention`s.
 * - `Transcript.Assistant` — the agent's markdown; `streaming` adds the working dots.
 * - `Transcript.Work` — a turn's work folded to one row: `summary`, `detail`, `running`; thinking, tools and agent runs inside.
 * - `Transcript.Thinking` — folded reasoning: `duration`, `defaultOpen`.
 * - `Transcript.Tools` / `Transcript.Tool` — a run of calls: `tool`, `summary`, `value`, `index`, `status`, `meta`, the output as children.
 * - `Transcript.Agent` — an agent run: `agent`, `description`, `status`, `background`, `meta`.
 * - `Transcript.Chapter` — a chapter break: `title`, `id`.
 * - `Transcript.Mention` / `Transcript.Attachment` — an @-file chip; a file, image or pasted-text chip.
 * - `Transcript.Working` — the in-flight dots.
 * - `Transcript.TaskList` — the pinned plan: `items`.
 * - `Transcript.NextStep` — the wrap-up box: `recap`, `ask`, `actions`.
 *
 * @example {@include ./examples.mdx}
 */
function Transcript({ children, chapters, defaultShowWork = false, footer, className }: TranscriptProps) {
  const [showWork, setShowWork] = useState(defaultShowWork)
  const Eye = useIcon('eye')
  const column = useRef<HTMLDivElement | null>(null)

  // A session opens on its latest turn. Scrolls only the transcript's own
  // viewport: scrollIntoView would move every scrolling ancestor too.
  useLayoutEffect(() => {
    const viewport = column.current?.closest<HTMLElement>('[data-slot="scroll-area-viewport"]')
    if (viewport) viewport.scrollTop = viewport.scrollHeight
  }, [])

  return (
    <div className={cn('relative flex min-h-0 flex-1 flex-col', className)}>
      <div className="absolute right-3 top-2 z-20 flex items-center gap-0.5">
        <Button
          variant="ghost"
          size="icon-compact"
          aria-label={showWork ? 'Hide work' : 'Show work'}
          aria-pressed={showWork}
          active={showWork}
          onClick={() => setShowWork(!showWork)}
        >
          <Eye />
        </Button>
        {chapters && chapters.length > 0 && <Toc chapters={chapters} />}
      </div>
      <ScrollArea className="min-h-0 flex-1" viewportClassName="scroll-fade">
        <ShowWorkContext.Provider value={showWork}>
          <div ref={column} className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-6 py-6 [contain:inline-size]">
            {children}
          </div>
        </ShowWorkContext.Provider>
      </ScrollArea>
      {footer && <div className="mx-auto flex w-full max-w-3xl flex-col gap-3 px-6 pb-3">{footer}</div>}
    </div>
  )
}

Transcript.User = UserMessage
Transcript.Assistant = AssistantMessage
Transcript.Work = Work
Transcript.Thinking = Thinking
Transcript.Tools = Tools
Transcript.Tool = Tool
Transcript.Agent = AgentRun
Transcript.Chapter = Chapter
Transcript.Mention = Mention
Transcript.Attachment = Attachment
Transcript.Working = Working
Transcript.TaskList = TaskList
Transcript.NextStep = NextStep

export type { TocChapter } from './toc'
export type { TaskItem } from './turn'
export type { TranscriptProps }

export default Transcript
