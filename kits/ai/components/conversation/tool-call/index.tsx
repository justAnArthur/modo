/*!
 * Local addition (not part of Fluid Functionalism): an AI's tool calls. A run
 * of calls is one Accordion group, so one fluid hover highlight runs down it
 * and each call's output morphs out of its row. Generalised from the AI app's
 * transcript.
 */

'use client'

import Accordion from '@justanarthur/modo-ui/components/containers/accordion'
import { Spinner } from '@justanarthur/modo-ui/components/feedback/progress'
import { statusGlyph } from '@justanarthur/modo-ui/components/feedback/status-dot'
import { useControllableState } from '@justanarthur/modo-ui/lib/use-controllable-state'
import { createContext, type ReactNode, useContext } from 'react'
import { useFoldBody } from '../../../lib/fold-body'
import { type IconName, useIcon } from '../../../lib/icons'

type ToolCallStatus = 'running' | 'waiting' | 'done' | 'error' | 'denied'

// Common tool names, matched case-blind; anything else takes `icon` or the wrench.
const TOOL_ICON: Partial<Record<string, IconName>> = {
  bash: 'terminal',
  shell: 'terminal',
  terminal: 'terminal',
  read: 'file-text',
  edit: 'pen-line',
  write: 'file-plus',
  grep: 'search',
  search: 'search',
  glob: 'folder-open',
  fetch: 'globe',
  webfetch: 'globe',
  websearch: 'globe',
  agent: 'bot',
  mcp: 'plug',
  todowrite: 'list-checks',
}

const Waiting = statusGlyph('waiting')

interface ToolStatusMarkProps {
  /** Where the call stands; `done` shows nothing. */
  status: ToolCallStatus
}

/** A call's state at the end of its row: the Spinner, the waiting dot, or the failed and denied marks. */
function ToolStatusMark({ status }: ToolStatusMarkProps) {
  const Failed = useIcon('circle-x')
  const Denied = useIcon('ban')
  if (status === 'running') return <Spinner className="size-3.5" />
  if (status === 'waiting') return <Waiting size={14} />
  if (status === 'error')
    return <Failed size={14} strokeWidth={1.5} aria-label="Failed" className="shrink-0 text-status-error" />
  if (status === 'denied')
    return <Denied size={14} strokeWidth={1.5} aria-label="Denied" className="shrink-0 text-muted-foreground" />
  return null
}

/** The open calls of the surrounding group, so a call renders its output only while open. */
const OpenCalls = createContext<string[] | null>(null)

interface ToolCallGroupProps {
  /** The calls, `ToolCall`s each with its `index`. */
  children: ReactNode
  /** Open calls, by `value`, controlled. Pair with `onValueChange`. */
  value?: string[]
  /** Calls open at first, by `value`. */
  defaultValue?: string[]
  /** Called with the open calls' values when one opens or closes. */
  onValueChange?: (value: string[]) => void
}

/** A run of tool calls: one hover highlight down the run, each call folds open in place. */
function ToolCallGroup({ children, value, defaultValue = [], onValueChange }: ToolCallGroupProps) {
  const [open, setOpen] = useControllableState(value, defaultValue, onValueChange)
  return (
    <Accordion.Group
      type="multiple"
      value={open}
      onValueChange={setOpen}
      size="compact"
      className="-mx-2.5 w-auto max-w-none"
    >
      <OpenCalls.Provider value={open}>{children}</OpenCalls.Provider>
    </Accordion.Group>
  )
}

interface ToolCallProps {
  /** The tool's name, shown in the row; a common one (Bash, Read, Edit, Grep, Fetch…) picks its glyph. */
  tool: string
  /** Its main argument: a command, a path, a pattern. */
  summary: string
  /** Its key, unique in the run. */
  value: string
  /** Its place in the run, from 0, for the shared hover. */
  index: number
  /** The glyph, for a tool the name doesn't match. Defaults to the name's glyph, else `'wrench'`. */
  icon?: IconName
  /** Where it stands. Defaults to `'done'`. */
  status?: ToolCallStatus
  /** A short result on the right: `+12 −3`, `42 lines`, `exit 1`. */
  meta?: ReactNode
  /** The output, folded until opened: a Diff, Code, terminal text. */
  children?: ReactNode
}

/**
 * One tool call an AI made: its glyph, name and argument in one row, the
 * output folded inside.
 *
 * Calls come in runs: a `ToolCall.Group` shares one fluid hover highlight
 * down the run, and each call with output opens in place, its output (a
 * Diff, a Code block, terminal text) morphing out of the row. A call without
 * output doesn't open. The end of the row carries a short result (`+3 −1`,
 * `exit 1`) and the call's state: the Spinner while it runs, the warning dot
 * while it waits on you, a mark when it failed or was denied, nothing once
 * it's done. The run is a compact region, and its rows reach into the margin
 * so the labels stay flush with the text around them. A closed call's output
 * isn't rendered: it mounts as the call opens and unmounts once it has
 * closed.
 *
 * Statics:
 * - `ToolCall.Group` — a run of calls: `defaultValue` opens some, or
 *   `value` + `onValueChange` hold them.
 *
 * @example {@include ./examples.mdx}
 */
const ToolCall = Object.assign(
  function ToolCall({ tool, summary, value, index, icon, status = 'done', meta, children }: ToolCallProps) {
    const Icon = useIcon(icon ?? TOOL_ICON[tool.toLowerCase()] ?? 'wrench')
    const open = useContext(OpenCalls)
    // Outside a group nothing says whether it's open: keep the output.
    const body = useFoldBody(open?.includes(value) ?? true)
    return (
      <Accordion.Item value={value} index={index} disabled={!children}>
        <Accordion.Trigger className="[&>span:first-child]:min-w-0 [&>span:first-child]:grid-cols-[minmax(0,1fr)]">
          <span className="flex min-w-0 items-center gap-2">
            <Icon size={14} strokeWidth={1.5} className="shrink-0" />
            <span className="shrink-0">{tool}</span>
            <span className="min-w-0 truncate font-mono text-caption-compact weight-normal text-muted-foreground">
              {summary}
            </span>
            {meta && (
              <span className="ml-auto shrink-0 text-caption-compact weight-normal text-muted-foreground">{meta}</span>
            )}
            <ToolStatusMark status={status} />
          </span>
        </Accordion.Trigger>
        {children && <Accordion.Content>{body && <div className="pb-2">{children}</div>}</Accordion.Content>}
      </Accordion.Item>
    )
  },
  { Group: ToolCallGroup },
)

export type { ToolCallGroupProps, ToolCallProps, ToolCallStatus, ToolStatusMarkProps }
export { ToolCall, ToolCallGroup, ToolStatusMark }

export default ToolCall
