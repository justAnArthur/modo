/*!
 * Local addition (not part of Fluid Functionalism): a sub-agent or background
 * agent's run, framed as a card with its own tool calls and report inside.
 * Generalised from the AI app's transcript.
 */

'use client'

import Badge from '@justanarthur/modo-ui/components/badge'
import { useShape } from '@justanarthur/modo-ui/lib/shape-context'
import { cn } from '@justanarthur/modo-ui/lib/utils'
import type { ReactNode } from 'react'
import { type IconName, useIcon } from '../../lib/icons'
import { ToolStatusMark } from '../tool-call'

type AgentRunStatus = 'running' | 'done' | 'error'

interface AgentRunProps {
  /** The agent's name or type: `Explore`, `researcher`, a custom agent. */
  agent: string
  /** What it was asked to do, in a few words. */
  description: string
  /** Where it stands. Defaults to `'done'`. */
  status?: AgentRunStatus
  /** Ran detached: the conversation went on without waiting. Defaults to `false`. */
  background?: boolean
  /** The run's tally: `14 tool uses · 38s`. */
  meta?: string
  /** The glyph before the name. Defaults to `'bot'`. */
  icon?: IconName
  /** Its calls (a `ToolCall.Group`) and its report. */
  children?: ReactNode
}

/**
 * A run an AI handed to another agent: a framed card with what it was asked,
 * its calls and its report.
 *
 * The header names the agent and its task, with the tally and the run's
 * state on the right (the Spinner while it runs, the failed mark on error).
 * A background run carries a badge: the conversation went on without
 * waiting for it. Inside, a `ToolCall.Group` lists its calls and a line of
 * text its report.
 *
 * @example {@include ./examples.mdx}
 */
function AgentRun({
  agent,
  description,
  status = 'done',
  background = false,
  meta,
  icon = 'bot',
  children,
}: AgentRunProps) {
  const shape = useShape()
  const Icon = useIcon(icon)
  return (
    <div className={cn('flex flex-col gap-2 border border-border p-[var(--space-3)]', shape.container)}>
      <div className="flex min-w-0 items-center gap-2">
        <Icon size={16} strokeWidth={1.5} className="shrink-0 text-muted-foreground" />
        <span className="shrink-0 text-body weight-medium text-foreground">{agent}</span>
        <span className="min-w-0 truncate text-body text-muted-foreground">{description}</span>
        {background && (
          <Badge size="compact" color="gray" className="shrink-0">
            Background
          </Badge>
        )}
        <span className="ml-auto flex shrink-0 items-center gap-2 text-caption text-muted-foreground">
          {meta}
          <ToolStatusMark status={status} />
        </span>
      </div>
      {children}
    </div>
  )
}

export type { AgentRunProps, AgentRunStatus }
export { AgentRun }

export default AgentRun
