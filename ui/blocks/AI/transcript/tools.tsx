/*!
 * Local addition: the transcript's tool calls and agent runs. A run of tool
 * calls is one Accordion group, so one fluid hover highlight runs down it and
 * each call's output morphs out of its row. An agent run (a subagent or a
 * background agent) is a framed card with its own calls inside.
 */

'use client'

import type { ReactNode } from 'react'
import Accordion from '../../../components/accordion'
import Badge from '../../../components/badge'
import { type IconName, useIcon } from '../../../lib/icon-context'
import { useShape } from '../../../lib/shape-context'
import { cn } from '../../../lib/utils'
import { RunningGlyph, WaitingGlyph } from '../status-glyph'

export type ToolName = 'Bash' | 'Read' | 'Edit' | 'Write' | 'Grep' | 'Glob' | 'WebFetch' | 'Agent' | 'MCP' | 'TodoWrite'
export type ToolStatus = 'running' | 'waiting' | 'done' | 'error' | 'denied'

const TOOL_ICON: Record<ToolName, IconName> = {
  Bash: 'terminal',
  Read: 'file-text',
  Edit: 'pen-line',
  Write: 'file-plus',
  Grep: 'search',
  Glob: 'folder-open',
  WebFetch: 'globe',
  Agent: 'bot',
  MCP: 'plug',
  TodoWrite: 'list-checks',
}

function StatusMark({ status }: { status: ToolStatus }) {
  const Failed = useIcon('circle-x')
  const Denied = useIcon('ban')
  if (status === 'running') return <RunningGlyph size={14} />
  if (status === 'waiting') return <WaitingGlyph size={14} />
  if (status === 'error')
    return <Failed size={14} strokeWidth={1.5} aria-label="Failed" className="shrink-0 text-status-error" />
  if (status === 'denied')
    return <Denied size={14} strokeWidth={1.5} aria-label="Denied" className="shrink-0 text-muted-foreground" />
  return null
}

export interface ToolsProps {
  /** The calls, `Transcript.Tool` each with its `index`. */
  children: ReactNode
  /** Calls open at first, by `value`. */
  defaultValue?: string[]
}

/** A run of tool calls: one hover highlight down the run, each call folds open in place. */
export function Tools({ children, defaultValue }: ToolsProps) {
  return (
    <Accordion.Group type="multiple" defaultValue={defaultValue} size="compact" className="-mx-2.5 w-auto max-w-none">
      {children}
    </Accordion.Group>
  )
}

export interface ToolProps {
  /** Which tool ran: picks the glyph. */
  tool: ToolName
  /** Its main argument: a command, a path, a pattern. */
  summary: string
  /** Its key, unique in the run. */
  value: string
  /** Its place in the run, from 0, for the shared hover. */
  index: number
  /** Where it stands. Defaults to `'done'`. */
  status?: ToolStatus
  /** A short result on the right: `+12 −3`, `42 lines`, `exit 1`. */
  meta?: ReactNode
  /** The output, folded until opened: a Diff, Code, terminal text. */
  children?: ReactNode
}

/** One tool call: its glyph, name and argument in the row, the output inside. */
export function Tool({ tool, summary, value, index, status = 'done', meta, children }: ToolProps) {
  const Icon = useIcon(TOOL_ICON[tool])
  return (
    <Accordion.Item value={value} index={index} disabled={!children}>
      <Accordion.Trigger className="[&>span:first-child]:min-w-0">
        <span className="flex min-w-0 items-center gap-2">
          <Icon size={14} strokeWidth={1.5} className="shrink-0" />
          <span className="shrink-0">{tool}</span>
          <span className="min-w-0 truncate font-mono text-caption-compact weight-normal text-muted-foreground">
            {summary}
          </span>
          {meta && (
            <span className="ml-auto shrink-0 text-caption-compact weight-normal text-muted-foreground">{meta}</span>
          )}
          <StatusMark status={status} />
        </span>
      </Accordion.Trigger>
      {children && (
        <Accordion.Content>
          <div className="pb-2">{children}</div>
        </Accordion.Content>
      )}
    </Accordion.Item>
  )
}

export interface AgentRunProps {
  /** The agent's type: `Explore`, `general-purpose`, a custom agent. */
  agent: string
  /** What it was asked to do, in a few words. */
  description: string
  /** Where it stands. Defaults to `'done'`. */
  status?: 'running' | 'done' | 'error'
  /** Ran detached from the turn; the turn went on without waiting. Defaults to `false`. */
  background?: boolean
  /** The run's tally: `14 tool uses · 38s`. */
  meta?: string
  /** Its calls (a `Transcript.Tools`) and its report. */
  children?: ReactNode
}

/** A subagent or background agent run: a framed card with its calls and report inside. */
export function AgentRun({ agent, description, status = 'done', background = false, meta, children }: AgentRunProps) {
  const shape = useShape()
  const Bot = useIcon('bot')
  return (
    <div className={cn('flex flex-col gap-2 border border-border p-[var(--space-3)]', shape.container)}>
      <div className="flex min-w-0 items-center gap-2">
        <Bot size={16} strokeWidth={1.5} className="shrink-0 text-muted-foreground" />
        <span className="shrink-0 text-body weight-medium text-foreground">{agent}</span>
        <span className="min-w-0 truncate text-body text-muted-foreground">{description}</span>
        {background && (
          <Badge size="compact" color="gray" className="shrink-0">
            Background
          </Badge>
        )}
        <span className="ml-auto flex shrink-0 items-center gap-2 text-caption text-muted-foreground">
          {meta}
          <StatusMark status={status} />
        </span>
      </div>
      {children}
    </div>
  )
}
