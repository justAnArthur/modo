/*!
 * Local addition: the agent desktop's interaction prompts — everything the
 * agent asks of the user mid-turn. One lifted frame (two surface levels up,
 * a popup's fixed shadow) with the prompts built on it: a permission request,
 * an AskUserQuestion (single, multiple, with previews), plan approval, and
 * the session cards (an offer to split work off, an own-initiative task).
 */

'use client'

import { type ReactNode, useState } from 'react'
import Badge from '../../../components/badge'
import Button from '../../../components/button'
import Checkbox from '../../../components/inputs/checkbox'
import Input from '../../../components/inputs/input'
import Textarea from '../../../components/inputs/textarea'
import { type IconName, useIcon } from '../../../lib/icon-context'
import { useShape } from '../../../lib/shape-context'
import { cn } from '../../../lib/utils'
import Code from '../../../primitives/code'
import ScrollArea from '../../../primitives/scroll-area'
import Elevated from '../../../primitives/surface'
import { PickList } from '../pick-list'
import { PROSE } from '../transcript/messages'

interface AgentPromptProps {
  /** What is asked, in one line. */
  title: ReactNode
  /** A glyph from the icon set for the kind of prompt. Defaults to `'circle-alert'`. */
  icon?: IconName
  /** A chip after the title: the tool, the question's topic. */
  tag?: string
  /** The prompt's body: what will run, the options, the plan. */
  children?: ReactNode
  /** The answers, on the bottom row. */
  actions?: ReactNode
  /** A muted hint on the bottom row's left: keys, scope. */
  hint?: ReactNode
  /** Classes for the frame. */
  className?: string
}

/**
 * Everything the agent stops to ask you mid-turn, as one family of lifted
 * cards under the transcript.
 *
 * The frame lifts two surface levels off the session, like a popup, so a
 * waiting prompt reads as the thing to answer next: a glyph and one line
 * saying what is asked, the body, then the answers on the bottom row with
 * the recommended one first. The statics are the prompts the agent desktop
 * needs.
 *
 * Statics:
 * - `AgentPrompt.Permission` — a tool wants to run: `tool`, `command`, an optional `detail` (a Diff, Code); allow once, always allow `rule`, or deny.
 * - `AgentPrompt.Question` — AskUserQuestion: `question`, `tag`, `options` (`label`, `description`, `preview`), `multiSelect`; an "Other" field; with previews, the focused option's preview shows beside the list.
 * - `AgentPrompt.Plan` — plan approval: the plan as markdown, approve with auto-accepted edits or with reviews, or keep planning with feedback.
 * - `AgentPrompt.Offer` — the agent asks where a task should run: a new session or here.
 * - `AgentPrompt.Task` — a task the agent proposes on its own: start it as a session, or dismiss it.
 *
 * @example {@include ./examples.mdx}
 */
function AgentPrompt({ title, icon = 'circle-alert', tag, children, actions, hint, className }: AgentPromptProps) {
  const shape = useShape()
  const Icon = useIcon(icon)
  return (
    <Elevated
      offset={2}
      shadowLevel={3}
      className={cn('flex flex-col gap-3 p-[var(--space-3)]', shape.container, className)}
    >
      <div className="flex min-w-0 items-center gap-2">
        <Icon size={16} strokeWidth={1.5} className="shrink-0 text-muted-foreground" />
        <span className="min-w-0 text-body weight-medium text-foreground">{title}</span>
        {tag && (
          <Badge size="compact" color="gray" className="shrink-0">
            {tag}
          </Badge>
        )}
      </div>
      {children}
      {(actions || hint) && (
        <div className="flex flex-wrap items-center gap-2">
          {hint && <span className="min-w-0 flex-1 text-caption text-muted-foreground">{hint}</span>}
          <div className="ml-auto flex flex-wrap justify-end gap-2">{actions}</div>
        </div>
      )}
    </Elevated>
  )
}

interface PermissionProps {
  /** The tool asking: `Bash`, `Edit`, an MCP tool. */
  tool: string
  /** What it would run: the command, the path. */
  command: string
  /** More of what it would do, under the command: a Diff for an edit. */
  detail?: ReactNode
  /** The rule "Always allow" would add. */
  rule?: string
  /** Called with the answer. */
  onAnswer?: (answer: 'once' | 'always' | 'deny') => void
}

function Permission({ tool, command, detail, rule, onAnswer }: PermissionProps) {
  return (
    <AgentPrompt
      icon="shield-check"
      title={`Allow ${tool} to run this?`}
      tag={tool}
      hint="Asked by the permission prompt tool · Esc denies"
      actions={
        <>
          <Button size="compact" variant="ghost" onClick={() => onAnswer?.('deny')}>
            Deny
          </Button>
          <Button size="compact" variant="tertiary" onClick={() => onAnswer?.('always')}>
            Always allow{rule ? ` ${rule}` : ''}
          </Button>
          <Button size="compact" onClick={() => onAnswer?.('once')}>
            Allow once
          </Button>
        </>
      }
    >
      <Code language="sh">{command}</Code>
      {detail}
    </AgentPrompt>
  )
}

interface QuestionOption {
  label: string
  description?: string
  /** Shown beside the list while this option is picked: a mockup, a snippet. */
  preview?: string
}

interface QuestionProps {
  /** The question. */
  question: string
  /** Its topic, as a chip: `Layout`, `Auth`. */
  tag?: string
  /** Two to four options. */
  options: QuestionOption[]
  /** Pick several. */
  multiSelect?: boolean
  /** Called with the picked labels and any "Other" text. */
  onSubmit?: (labels: string[], other: string) => void
}

function OptionContent({ option }: { option: QuestionOption }) {
  return (
    <span className="flex min-w-0 flex-col">
      <span className="text-body text-foreground">{option.label}</span>
      {option.description && <span className="text-caption text-muted-foreground">{option.description}</span>}
    </span>
  )
}

function Question({ question, tag, options, multiSelect = false, onSubmit }: QuestionProps) {
  const [picked, setPicked] = useState(options[0]?.label ?? '')
  const [checked, setChecked] = useState<Set<number>>(new Set())
  const [other, setOther] = useState('')
  const preview = options.find(o => o.label === picked)?.preview
  const hasPreviews = options.some(o => o.preview)

  const list = multiSelect ? (
    <Checkbox.Group checkedIndices={checked} onCheckedIndicesChange={setChecked} className="w-full">
      {options.map(option => (
        <Checkbox key={option.label} label={option.label} />
      ))}
    </Checkbox.Group>
  ) : (
    <PickList
      label={question}
      value={picked}
      onValueChange={setPicked}
      options={options.map(option => ({
        value: option.label,
        label: option.label,
        content: <OptionContent option={option} />,
      }))}
    />
  )

  const submit = () =>
    onSubmit?.(multiSelect ? options.filter((_, i) => checked.has(i)).map(o => o.label) : [picked], other)

  return (
    <AgentPrompt
      icon="message-circle"
      title={question}
      tag={tag}
      hint={multiSelect ? 'Pick any' : '↑↓ to move'}
      actions={
        <Button size="compact" onClick={submit}>
          Submit
        </Button>
      }
    >
      <div className={cn('grid gap-3', hasPreviews && '@container')}>
        <div className={cn('grid gap-3', hasPreviews && '@lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]')}>
          <div className={cn('flex min-w-0 flex-col gap-1', multiSelect ? '-mx-3' : '-mx-2')}>{list}</div>
          {hasPreviews && (
            <div className="flex min-w-0 flex-col gap-1.5">
              <span className="text-caption text-muted-foreground">Preview</span>
              <Code language="plaintext">{preview ?? 'No preview for this option.'}</Code>
            </div>
          )}
        </div>
        <Input placeholder="Other: type your own answer" value={other} onChange={setOther} />
      </div>
    </AgentPrompt>
  )
}

interface PlanProps {
  /** The plan, as rendered markdown. */
  children: ReactNode
  /** Called with the decision and any feedback. */
  onDecide?: (decision: 'auto' | 'review' | 'keep-planning', feedback: string) => void
}

function Plan({ children, onDecide }: PlanProps) {
  const [feedback, setFeedback] = useState('')
  return (
    <AgentPrompt
      icon="list-checks"
      title="Ready to code? Here is the plan."
      tag="Plan mode"
      actions={
        <>
          <Button size="compact" variant="ghost" onClick={() => onDecide?.('keep-planning', feedback)}>
            Keep planning
          </Button>
          <Button size="compact" variant="tertiary" onClick={() => onDecide?.('review', feedback)}>
            Approve, ask before edits
          </Button>
          <Button size="compact" onClick={() => onDecide?.('auto', feedback)}>
            Approve, accept edits
          </Button>
        </>
      }
    >
      <ScrollArea className="max-h-72 rounded-xl border border-border" viewportClassName="scroll-fade">
        <div className={cn(PROSE, 'p-[var(--space-3)]')}>{children}</div>
      </ScrollArea>
      <Textarea
        minRows={1}
        maxRows={4}
        value={feedback}
        onChange={setFeedback}
        placeholder="Tell Claude what to change"
      />
    </AgentPrompt>
  )
}

interface OfferProps {
  /** The task, as a short title. */
  title: string
  /** Why it could run on its own, in one line. */
  brief?: string
  /** Called with where it should run. */
  onChoose?: (where: 'new-session' | 'here') => void
}

function Offer({ title, brief, onChoose }: OfferProps) {
  return (
    <AgentPrompt
      icon="split"
      title={title}
      tag="New session?"
      actions={
        <>
          <Button size="compact" variant="tertiary" onClick={() => onChoose?.('here')}>
            Do it here
          </Button>
          <Button size="compact" onClick={() => onChoose?.('new-session')}>
            New session
          </Button>
        </>
      }
    >
      {brief && <p className="m-0 text-body text-muted-foreground">{brief}</p>}
    </AgentPrompt>
  )
}

interface TaskProps {
  /** The proposed task. */
  title: string
  /** What it would do and what done looks like. */
  brief: string
  /** The profile and place it would start in: `jobiflow · new worktree`. */
  where?: string
  /** Called with the decision. */
  onDecide?: (decision: 'start' | 'dismiss') => void
}

function Task({ title, brief, where, onDecide }: TaskProps) {
  return (
    <AgentPrompt
      icon="git-fork"
      title={title}
      tag="New task"
      hint={where ? `${where} · expires in 7 days` : 'Expires in 7 days'}
      actions={
        <>
          <Button size="compact" variant="ghost" onClick={() => onDecide?.('dismiss')}>
            Dismiss
          </Button>
          <Button size="compact" variant="tertiary" onClick={() => onDecide?.('start')}>
            Start session
          </Button>
        </>
      }
    >
      <p className="m-0 text-body text-muted-foreground">{brief}</p>
    </AgentPrompt>
  )
}

AgentPrompt.Permission = Permission
AgentPrompt.Question = Question
AgentPrompt.Plan = Plan
AgentPrompt.Offer = Offer
AgentPrompt.Task = Task

export type { AgentPromptProps, OfferProps, PermissionProps, PlanProps, QuestionOption, QuestionProps, TaskProps }

export default AgentPrompt
