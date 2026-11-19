/*!
 * Local addition: a Claude Code session read back, the fix run's or an ai
 * check's, on modo-ui-ai's Transcript, fed the way the AI app feeds it: the
 * prompt folded to a task card, each turn's work to one row.
 */

'use client'

import Accordion from '@justanarthur/modo-ui/components/containers/accordion'
import Diff from '@justanarthur/modo-ui/components/data-display/diff'
import Markdown from '@justanarthur/modo-ui/components/data-display/markdown'
import { Spinner } from '@justanarthur/modo-ui/components/feedback/progress'
import { useShape } from '@justanarthur/modo-ui/lib/shape-context'
import { cn } from '@justanarthur/modo-ui/lib/utils'
import Code from '@justanarthur/modo-ui/primitives/content/code'
import Transcript from '@justanarthur/modo-ui-ai/blocks/conversation/transcript'
import { ClipboardList } from 'lucide-react'
import type { ReactNode } from 'react'
import type { TranscriptItem } from '../../../lib/types'
import { duration, plural } from '../format'

type Tool = Extract<TranscriptItem, { kind: 'tool' }>

const MAX_LINES = 40

const str = (value: unknown) => (typeof value === 'string' ? value : undefined)
const lines = (text: string) => (text ? text.replace(/\n$/, '').split('\n') : [])

function clip(text: string) {
  const all = lines(text)
  return all.length > MAX_LINES ? `${all.slice(0, MAX_LINES).join('\n')}\n…` : text
}

/** The one input a reader needs to tell the call apart: the command, the file, the pattern, the URL. */
const summarize = (input: Record<string, unknown>) =>
  str(input.command) ?? str(input.file_path) ?? str(input.pattern) ?? str(input.url) ?? str(input.description) ?? ''

/** An Edit or Write as a patch. */
function patchOf({ name, input }: Tool) {
  const before = name === 'Edit' ? str(input.old_string) : ''
  const after = str(name === 'Edit' ? input.new_string : input.content)
  if ((name !== 'Edit' && name !== 'Write') || before === undefined || after === undefined) return
  const removed = lines(before)
  const added = lines(after)
  return {
    meta: `+${added.length} −${removed.length}`,
    patch: [
      `@@ -1,${removed.length} +1,${added.length} @@`,
      ...removed.map(line => `-${line}`),
      ...added.map(line => `+${line}`),
    ].join('\n'),
  }
}

function status(tool: Tool, running: boolean) {
  if (tool.is_error) return 'error'
  if (tool.result !== undefined) return 'done'
  return running ? 'running' : 'done'
}

function ToolRun({ tools, running }: { tools: Tool[]; running: boolean }) {
  return (
    <Transcript.Tools>
      {tools.map((tool, index) => {
        const change = !tool.is_error && patchOf(tool)
        const count = lines(tool.result ?? '').length
        return (
          <Transcript.Tool
            key={tool.id}
            value={tool.id}
            index={index}
            tool={tool.name}
            summary={summarize(tool.input)}
            status={status(tool, running)}
            meta={tool.is_error ? 'error' : change ? change.meta : count > 1 ? `${count} lines` : undefined}
          >
            {change ? (
              <Diff lineNumbers={false} patch={change.patch} />
            ) : (
              tool.result && <Code language="plaintext">{clip(tool.result)}</Code>
            )}
          </Transcript.Tool>
        )
      })}
    </Transcript.Tools>
  )
}

/** Tool calls in a row share one group; thinking and text break it. */
function workItems(items: TranscriptItem[], running: boolean) {
  const out: ReactNode[] = []
  let tools: Tool[] = []
  const flush = () => {
    if (tools.length) out.push(<ToolRun key={tools[0]!.id} tools={tools} running={running} />)
    tools = []
  }
  for (const item of items) {
    if (item.kind === 'tool') {
      tools.push(item)
      continue
    }
    flush()
    if (item.kind === 'thinking')
      out.push(
        <Transcript.Thinking key={item.id}>
          <p className="m-0 whitespace-pre-wrap">{item.text}</p>
        </Transcript.Thinking>,
      )
    else out.push(<Markdown key={item.id}>{item.text}</Markdown>)
  }
  flush()
  return out
}

/** The tool the turn is on now, in a few words: `Bash · Build, serve and read the header`. */
function current(tools: Tool[]) {
  const tool = tools.at(-1)
  if (!tool) return undefined
  const what = str(tool.input.description) ?? summarize(tool.input)
  return what ? `${tool.name} · ${what}` : tool.name
}

function AssistantTurn({ items, live }: { items: TranscriptItem[]; live: boolean }) {
  // What the agent did folds into the turn's work; the text after its last call is the reply.
  let split = items.length
  while (split > 0 && items[split - 1]!.kind === 'text') split--
  const work = items.slice(0, split)
  const reply = items.slice(split)
  const tools = work.filter((item): item is Tool => item.kind === 'tool')
  const ms = tools.reduce((sum, tool) => sum + (tool.ms ?? 0), 0)
  const count = tools.length ? plural(tools.length, 'tool call') : 'Thought'
  return (
    <Transcript.Assistant>
      {work.length > 0 && (
        <Transcript.Work
          summary={live ? 'Working…' : ms ? `Worked for ${duration(ms)}` : count}
          detail={live ? current(tools) : ms ? count : undefined}
          running={live}
        >
          {workItems(work, live)}
        </Transcript.Work>
      )}
      {reply.map(
        (item, index) =>
          item.kind === 'text' && (
            <Markdown key={item.id} streaming={live && index === reply.length - 1}>
              {item.text}
            </Markdown>
          ),
      )}
    </Transcript.Assistant>
  )
}

/** The prompt the session started from, folded to its first line: a fix run's task is long, and it is the same every time. */
function TaskCard({ text }: { text: string }) {
  const shape = useShape()
  const [first] = lines(text)
  return (
    <Accordion type="single" collapsible className={cn('w-full max-w-none border border-border', shape.container)}>
      <Accordion.Item value="task">
        <Accordion.Trigger className="px-3 [&>span:first-child]:min-w-0 [&>span:first-child]:grid-cols-[minmax(0,1fr)]">
          <span className="flex min-w-0 items-center gap-2">
            <ClipboardList size={16} strokeWidth={1.5} className="shrink-0 text-muted-foreground" />
            <span className="shrink-0">Task</span>
            {/* Open, the prompt shows whole below. */}
            <span className="min-w-0 truncate weight-normal text-muted-foreground [[aria-expanded=true]_&]:hidden">
              {first}
            </span>
          </span>
        </Accordion.Trigger>
        <Accordion.Content>
          <p className="m-0 whitespace-pre-wrap break-words pb-3 text-body text-foreground">{text}</p>
        </Accordion.Content>
      </Accordion.Item>
    </Accordion>
  )
}

/** The one live line while the session runs and no turn's work row says so. */
function Working() {
  return (
    <div role="status" className="flex items-center gap-2 text-body-compact text-muted-foreground">
      <Spinner className="size-3.5" />
      Working…
    </div>
  )
}

/** The user's messages stand alone; everything between two of them is one assistant turn. */
function turns(items: TranscriptItem[]) {
  const out: TranscriptItem[][] = []
  for (const item of items) {
    const last = out.at(-1)
    if (item.kind !== 'user' && last && last[0]!.kind !== 'user') last.push(item)
    else out.push([item])
  }
  return out
}

interface RunTranscriptProps {
  /** The session's items, oldest first: the prompt, then what the agent thought, did and said. */
  items: TranscriptItem[]
  /** The session is still going: its last turn streams and a tool without a result spins. Defaults to `false`. */
  running?: boolean
  /** Start with every turn's work unfolded. Defaults to `false`. */
  defaultShowWork?: boolean
  /** Pinned under the column, outside the scroll. */
  footer?: ReactNode
  /** Classes for the root. */
  className?: string
}

/**
 * A Claude Code session read back: a worker's fix run, or the model's side of
 * an ai check.
 *
 * It is the AI app's Transcript (see modo-ui-ai) on the session as the engine
 * records it. The prompt the run started from (a fix run's task, an ai
 * check's question) opens it as a Task card folded to its first line, not as
 * a chat bubble; press it for the whole prompt. What the agent did on the way
 * (its thinking, each tool call with its output, an edit as a diff) folds
 * into one row per turn, "Worked for 6m 12s · 10 tool calls", so the reply
 * reads clean; press a row to open it, or the eye in the corner for all of
 * them. While the session runs, one plain line says so: the live turn's row
 * reads "Working…" with the call it is on, or, before the turn has any work,
 * a "Working…" line closes the column. A running session follows its newest
 * turn while you read at its end.
 *
 * Fill a bounded column: the transcript scrolls inside itself.
 *
 * @example {@include ./examples.mdx}
 */
export default function RunTranscript({
  items,
  running = false,
  defaultShowWork = false,
  footer,
  className,
}: RunTranscriptProps) {
  const [task, rest] = items[0]?.kind === 'user' ? [items[0], items.slice(1)] : [undefined, items]
  const groups = turns(rest)
  const last = groups.at(-1)
  const liveWork = running && last?.[0]?.kind !== 'user' && last?.some(item => item.kind !== 'text')
  return (
    <Transcript defaultShowWork={defaultShowWork} footer={footer} className={className}>
      {task && <TaskCard text={task.text} />}
      {groups.map((group, index) => {
        const [first] = group as [TranscriptItem]
        if (first.kind === 'user')
          return (
            <Transcript.User key={first.id}>
              <span className="whitespace-pre-wrap">{first.text}</span>
            </Transcript.User>
          )
        return <AssistantTurn key={first.id} items={group} live={running && index === groups.length - 1} />
      })}
      {running && !liveWork && <Working />}
    </Transcript>
  )
}

export type { RunTranscriptProps }
export { RunTranscript }
