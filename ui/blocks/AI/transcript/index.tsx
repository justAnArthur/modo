/*!
 * Local addition: the AI app's transcript. A scrolling reading column for
 * one session, with the show-work toggle and the chapter list floating in its
 * corner. The parts are the generic AI components (Message, Reasoning,
 * ToolCall, AgentRun, WorkSummary, ChapterNav, TodoList, Recap), aliased as
 * statics.
 */

'use client'

import { type ReactNode, useLayoutEffect, useRef, useState } from 'react'
import AgentRun from '../../../components/AI/agent-run'
import ChapterNav, { type ChapterNavItem } from '../../../components/AI/chapter-nav'
import Message, { type MessageProps } from '../../../components/AI/message'
import Reasoning from '../../../components/AI/reasoning'
import Recap from '../../../components/AI/recap'
import TodoList from '../../../components/AI/todo-list'
import ToolCall from '../../../components/AI/tool-call'
import WorkSummary from '../../../components/AI/work-summary'
import Button from '../../../components/button'
import { useIcon } from '../../../lib/icon-context'
import { cn } from '../../../lib/utils'
import ScrollArea from '../../../primitives/scroll-area'

/** The tools the AI app's mock sessions call. */
type ToolName = 'Bash' | 'Read' | 'Edit' | 'Write' | 'Grep' | 'Glob' | 'WebFetch' | 'Agent' | 'MCP' | 'TodoWrite'

type TurnProps = Omit<MessageProps, 'role'>

function User(props: TurnProps) {
  // biome-ignore lint/a11y/useValidAriaRole: Message's `role` is who speaks, not an ARIA role
  return <Message role="user" {...props} />
}

function Assistant(props: TurnProps) {
  // biome-ignore lint/a11y/useValidAriaRole: Message's `role` is who speaks, not an ARIA role
  return <Message role="assistant" {...props} />
}

interface TranscriptProps {
  /** The turns: `Transcript.User`, `Transcript.Assistant` and the parts below. */
  children: ReactNode
  /** The session's chapters, for the chapter list in the corner. Omit for no list. */
  chapters?: ChapterNavItem[]
  /** Start with every turn's work unfolded. Defaults to `false`. */
  defaultShowWork?: boolean
  /** Pinned under the column, outside the scroll: a TodoList, a prompt, a Recap. */
  footer?: ReactNode
  /** Classes for the root. */
  className?: string
}

/**
 * One session's conversation: what you asked, what the agent said and did,
 * and where the turn left off.
 *
 * The turns sit in one reading column and are the AI components: your
 * messages and the agent's replies are Messages; what the agent did on the
 * way (Reasoning, ToolCalls, AgentRuns) folds into one WorkSummary per
 * turn, so the output reads clean. Press a row to open it, or the eye in the
 * corner to show every turn's work at once. Chapters break the column with a
 * titled hairline, and the ChapterNav in the corner jumps between them; in a
 * narrow column both controls take a row of their own above it. The
 * `footer` stays put under the column: that is where the TodoList, a pending
 * prompt and the Recap live. The session opens scrolled to its latest turn.
 *
 * Statics (aliases of the components, named for the session):
 * - `Transcript.User` / `Transcript.Assistant` — a Message with its `role` set.
 * - `Transcript.Work` — WorkSummary.
 * - `Transcript.Thinking` — Reasoning.
 * - `Transcript.Tools` / `Transcript.Tool` — ToolCall.Group / ToolCall.
 * - `Transcript.Agent` — AgentRun.
 * - `Transcript.Chapter` — ChapterNav.Break.
 * - `Transcript.Mention` / `Transcript.Attachment` / `Transcript.Working` — Message.Mention / Message.Attachment / Message.Working.
 * - `Transcript.TaskList` — TodoList.
 * - `Transcript.NextStep` — Recap.
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
    <div className={cn('@container relative flex min-h-0 flex-1 flex-col', className)}>
      {/* A narrow column has no margin to float them in: there they take a row of their own above it. */}
      <div className="flex shrink-0 items-center justify-end gap-0.5 px-3 pt-1 @3xl:absolute @3xl:right-3 @3xl:top-2 @3xl:z-20 @3xl:p-0">
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
        {chapters && chapters.length > 0 && <ChapterNav chapters={chapters} />}
      </div>
      <ScrollArea className="min-h-0 flex-1" viewportClassName="scroll-fade">
        <WorkSummary.Provider open={showWork}>
          <div ref={column} className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-6 py-6 [contain:inline-size]">
            {children}
          </div>
        </WorkSummary.Provider>
      </ScrollArea>
      {footer && <div className="mx-auto flex w-full max-w-3xl flex-col gap-3 px-6 pb-3">{footer}</div>}
    </div>
  )
}

Transcript.User = User
Transcript.Assistant = Assistant
Transcript.Work = WorkSummary
Transcript.Thinking = Reasoning
Transcript.Tools = ToolCall.Group
Transcript.Tool = ToolCall
Transcript.Agent = AgentRun
Transcript.Chapter = ChapterNav.Break
Transcript.Mention = Message.Mention
Transcript.Attachment = Message.Attachment
Transcript.Working = Message.Working
Transcript.TaskList = TodoList
Transcript.NextStep = Recap

export type { ChapterNavItem as TocChapter } from '../../../components/AI/chapter-nav'
export type { TodoItem as TaskItem } from '../../../components/AI/todo-list'
export type { ToolName, TranscriptProps }

export default Transcript
