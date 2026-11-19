/*!
 * Local addition: the AI app's transcript. A scrolling reading column for
 * one session, with the show-work toggle and the chapter list floating in its
 * corner; it follows a growing session while you read at its end. The parts
 * are the generic AI components (Message, Reasoning,
 * ToolCall, AgentRun, WorkSummary, ChapterNav, TodoList, Recap), aliased as
 * statics.
 */

'use client'

import { useReduceMotion } from '@justanarthur/modo-ui'
import Button from '@justanarthur/modo-ui/components/actions/button'
import Markdown from '@justanarthur/modo-ui/components/data-display/markdown'
import { useShape } from '@justanarthur/modo-ui/lib/shape-context'
import { spring } from '@justanarthur/modo-ui/lib/springs'
import { cn } from '@justanarthur/modo-ui/lib/utils'
import ScrollArea from '@justanarthur/modo-ui/primitives/layout/scroll-area'
import { AnimatePresence, motion } from 'motion/react'
import { type ReactNode, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import AgentRun from '../../../components/conversation/agent-run'
import ChapterNav, { type ChapterNavItem } from '../../../components/conversation/chapter-nav'
import Message, { type MessageProps } from '../../../components/conversation/message'
import Reasoning from '../../../components/conversation/reasoning'
import Recap from '../../../components/conversation/recap'
import TodoList, { type TodoItem } from '../../../components/conversation/todo-list'
import ToolCall from '../../../components/conversation/tool-call'
import WorkSummary from '../../../components/conversation/work-summary'
import { type IconName, useIcon } from '../../../lib/icons'

type TurnProps = Omit<MessageProps, 'role'>

// Off-screen turns skip layout and paint, so a resize (a side pane dragged, the
// window) re-lays out only the turns in view; each keeps its last height while
// skipped (a guess until it first shows), so the scrollbar holds still.
// That contains paint to the turn's box: an assistant turn widens it by a
// padding its negative margin takes back, so the work rows' hover fill (which
// bleeds past the column) and focus rings still show.
// The rhythm: a user turn opens an exchange, so it takes more than a column gap
// above it (40px from the reply before) than below (16px to its reply), and
// the column reads as question and answer pairs; the assistant turn's `-my-1`
// gives back the paint margin it adds.
const USER_TURN = 'content-visibility-auto [contain-intrinsic-size:auto_5rem] mt-6 first:mt-0'
const ASSISTANT_TURN = 'content-visibility-auto [contain-intrinsic-size:auto_20rem] -mx-4 px-4 -my-1 py-1'

// No static's key names a binding of this file: the declaration bundler renames
// a clashing binding to Name2, and a key spelled like it goes along (`Transcript.Working2`).
function UserTurn({ className, ...props }: TurnProps) {
  // biome-ignore lint/a11y/useValidAriaRole: Message's `role` is who speaks, not an ARIA role
  return <Message role="user" className={cn(USER_TURN, className)} {...props} />
}

/** The agent's turn. A string is markdown, rendered as it streams in; JSX (work, tool runs, prose) renders as is. */
function AssistantTurn({ children, streaming, className, ...props }: TurnProps) {
  if (typeof children === 'string')
    return (
      <div className={cn('flex flex-col gap-3', ASSISTANT_TURN, className)}>
        <Markdown streaming={streaming}>{children}</Markdown>
        {streaming && <Message.Working />}
      </div>
    )
  return (
    // biome-ignore lint/a11y/useValidAriaRole: Message's `role` is who speaks, not an ARIA role
    <Message role="assistant" streaming={streaming} className={cn(ASSISTANT_TURN, className)} {...props}>
      {children}
    </Message>
  )
}

interface CompactBoundaryProps {
  /** What the compaction kept: a string is markdown. Omit for the divider alone. */
  summary?: ReactNode
  /** The divider's label. Defaults to `'Conversation compacted'`. */
  label?: string
  /** Start with the summary open. Defaults to `false`. */
  defaultOpen?: boolean
}

/** Where the conversation was compacted: a centered hairline whose label opens the summary. */
function CompactBoundary({ summary, label = 'Conversation compacted', defaultOpen = false }: CompactBoundaryProps) {
  const [open, setOpen] = useState(defaultOpen)
  const shape = useShape()
  const reduceMotion = useReduceMotion()
  const Chevron = useIcon(open ? 'chevron-up' : 'chevron-down')
  const id = useId()
  const rule = <span aria-hidden="true" className="h-px flex-1 bg-border" />
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3">
        {rule}
        {summary ? (
          <Button
            variant="ghost"
            size="compact"
            trailingIcon={Chevron}
            aria-expanded={open}
            aria-controls={id}
            onClick={() => setOpen(!open)}
          >
            {label}
          </Button>
        ) : (
          <span className="text-caption text-muted-foreground">{label}</span>
        )}
        {rule}
      </div>
      <AnimatePresence initial={false}>
        {open && summary && (
          <motion.div
            id={id}
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, height: 0 }}
            animate={reduceMotion ? { opacity: 1 } : { opacity: 1, height: 'auto' }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, height: 0, transition: spring.moderate.exit }}
            transition={spring.moderate}
            className="overflow-hidden"
          >
            <div className={cn('border border-border px-4 py-3 text-muted-foreground', shape.container)}>
              {typeof summary === 'string' ? <Markdown>{summary}</Markdown> : summary}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

interface TranscriptNoticeProps {
  /** The notice: `Interrupted`, `Model switched to Sonnet 5.5`. */
  children: ReactNode
  /** A glyph before it. Omit for text alone. */
  icon?: IconName
}

/** A quiet line between turns for something that happened to the session, not something said. */
function TranscriptNotice({ children, icon }: TranscriptNoticeProps) {
  const Icon = useIcon(icon ?? 'circle-dot')
  return (
    <p role="note" className="m-0 flex items-center justify-center gap-2 text-caption text-muted-foreground">
      {icon && <Icon size={14} strokeWidth={1.5} className="shrink-0" />}
      {children}
    </p>
  )
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
 * The turns sit in one reading column, capped at a readable measure, and
 * are the AI components: your messages and the agent's replies are
 * Messages, with more space above each of yours than inside an exchange,
 * so the column reads as question and answer pairs; what the agent did on the
 * way (Reasoning, ToolCalls, AgentRuns) folds into one WorkSummary per
 * turn, so the output reads clean. Press a row to open it, or the eye in the
 * corner to show every turn's work at once. Chapters break the column with a
 * titled hairline, and the ChapterNav in the corner jumps between them; in a
 * narrow column both controls take a row of their own above it. The
 * `footer` stays put under the column: that is where the TodoList, a pending
 * prompt and the Recap live. The session opens scrolled to its latest turn
 * and follows it: while you read at the end, a turn that arrives or a reply
 * that streams keeps it in view; scroll up and it lets go, with a button to
 * jump back to the latest.
 *
 * Built for long sessions: a turn out of view (`Transcript.User`,
 * `Transcript.Assistant`) skips layout and paint (`content-visibility:
 * auto`), so resizing the column next to hundreds of turns re-lays out only
 * the ones you see. Its text stays selectable and findable, and a chapter
 * inside it still scrolls into view. The column's text is selectable even
 * inside an app whose chrome turns selection off.
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
 * - `Transcript.Compact` — where the conversation was compacted: a centered
 *   hairline, "Conversation compacted", whose label opens the `summary`
 *   (markdown), so a compaction reads as a boundary instead of a giant
 *   message. `label`, `defaultOpen`.
 * - `Transcript.Notice` — a quiet centered line for something that happened
 *   to the session rather than something said ("Interrupted", "Model
 *   switched"): `children`, `icon`.
 *
 * @example {@include ./examples.mdx}
 */
const Transcript = Object.assign(
  function Transcript({ children, chapters, defaultShowWork = false, footer, className }: TranscriptProps) {
    const [showWork, setShowWork] = useState(defaultShowWork)
    const [following, setFollowing] = useState(true)
    const Eye = useIcon('eye')
    const Down = useIcon('arrow-down')
    const column = useRef<HTMLDivElement | null>(null)
    const viewport = useRef<HTMLElement | null>(null)
    const atEnd = useRef(true)

    // Scrolls only the transcript's own viewport: scrollIntoView would move every scrolling ancestor too.
    const toEnd = () => {
      const el = viewport.current
      if (el) el.scrollTop = el.scrollHeight
    }

    // A session opens on its latest turn.
    useLayoutEffect(() => {
      viewport.current = column.current?.closest<HTMLElement>('[data-slot="scroll-area-viewport"]') ?? null
      toEnd()
    }, [])

    // Content that grows under a reader at the end fires no scroll event, so `atEnd` still holds.
    useEffect(() => {
      const el = viewport.current
      const content = column.current
      if (!el || !content) return
      // At the end the transcript sticks on its own: scroll anchoring off there,
      // or a turn above laying out (an off-screen one coming near) would nudge
      // the scroll and read as the reader leaving the end. Reading higher up,
      // anchoring keeps the text still.
      const follow = (end: boolean) => {
        atEnd.current = end
        el.style.overflowAnchor = end ? 'none' : ''
      }
      const onScroll = () => {
        const end = el.scrollHeight - el.scrollTop - el.clientHeight < 8
        if (end === atEnd.current) return
        follow(end)
        setFollowing(end)
      }
      follow(atEnd.current)
      // Heights from the entries, not the DOM: a width-only change (a pane
      // dragged wider) reads no layout. A grown column or a shrunk viewport
      // sticks to the end once, on the next frame, however many lines landed.
      const heights = new WeakMap<Element, number>()
      let frame = 0
      const observer = new ResizeObserver(entries => {
        let changed = false
        for (const entry of entries) {
          const height = entry.borderBoxSize[0]?.blockSize ?? entry.contentRect.height
          if (heights.get(entry.target) === height) continue
          heights.set(entry.target, height)
          changed = true
        }
        if (!changed || !atEnd.current || frame) return
        frame = requestAnimationFrame(() => {
          frame = 0
          if (atEnd.current) toEnd()
        })
      })
      el.addEventListener('scroll', onScroll, { passive: true })
      observer.observe(content)
      observer.observe(el)
      return () => {
        el.removeEventListener('scroll', onScroll)
        observer.disconnect()
        cancelAnimationFrame(frame)
      }
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
            <div
              ref={column}
              className="mx-auto flex w-full max-w-3xl select-text flex-col gap-4 px-6 py-6 [contain:inline-size]"
            >
              {children}
            </div>
          </WorkSummary.Provider>
        </ScrollArea>
        {!following && (
          <div className="pointer-events-none relative z-20 mx-auto flex w-full max-w-3xl justify-center px-6">
            <Button
              variant="secondary"
              size="compact"
              leadingIcon={Down}
              className="pointer-events-auto absolute bottom-2"
              onClick={toEnd}
            >
              Latest
            </Button>
          </div>
        )}
        {footer && <div className="mx-auto flex w-full max-w-3xl flex-col gap-3 px-6 pb-3">{footer}</div>}
      </div>
    )
  },
  {
    User: UserTurn,
    Assistant: AssistantTurn,
    Work: WorkSummary,
    Thinking: Reasoning,
    Tools: ToolCall.Group,
    Tool: ToolCall,
    Agent: AgentRun,
    Chapter: ChapterNav.Break,
    Mention: Message.Mention,
    Attachment: Message.Attachment,
    Working: Message.Working,
    TaskList: TodoList,
    NextStep: Recap,
    Compact: CompactBoundary,
    Notice: TranscriptNotice,
  },
)

/** A chapter in the corner list: ChapterNavItem, named for the session. */
type TocChapter = ChapterNavItem
/** A row of the pinned task list: TodoItem, named for the session. */
type TaskItem = TodoItem

export type { CompactBoundaryProps, TaskItem, TocChapter, TranscriptNoticeProps, TranscriptProps }

export default Transcript

export { Transcript }
