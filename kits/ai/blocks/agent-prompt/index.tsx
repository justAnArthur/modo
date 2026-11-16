/*!
 * Local addition: the AI app's interaction prompts — everything the agent
 * asks of the user mid-turn. The generic prompts (Prompt card, Permission
 * request, Question prompt, Plan approval) live in the kit's `components/`; this
 * block adds the session cards (an offer to split work off, an
 * own-initiative task) and gathers them all as statics.
 */

'use client'

import Button from '@justanarthur/modo-ui/components/button'
import PermissionRequest from '../../components/permission-request'
import PlanApproval from '../../components/plan-approval'
import PromptCard, { type PromptCardProps } from '../../components/prompt-card'
import QuestionPrompt from '../../components/question-prompt'

type AgentPromptProps = PromptCardProps

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
    <PromptCard
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
    </PromptCard>
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
    <PromptCard
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
    </PromptCard>
  )
}

/**
 * Everything the agent stops to ask you mid-turn, as one family of lifted
 * cards under the transcript.
 *
 * The frame is the Prompt card, and the permission, question and plan
 * prompts are the generic Permission request, Question prompt and Plan
 * approval; the statics gather them under one name. What is specific to
 * the AI app is the pair of session cards: where a task should run, and a
 * task the agent proposes on its own.
 *
 * Statics:
 * - `AgentPrompt.Permission` — Permission request: `tool`, `command`, `detail`, `rule`.
 * - `AgentPrompt.Question` — Question prompt: `question`, `tag`, `options`, `multiSelect`.
 * - `AgentPrompt.Plan` — Plan approval: the plan as children, `onDecide`.
 * - `AgentPrompt.Offer` — the agent asks where a task should run: a new session or here (`title`, `brief`, `onChoose`).
 * - `AgentPrompt.Task` — a task the agent proposes on its own: start it as a session, or dismiss it (`title`, `brief`, `where`, `onDecide`).
 *
 * @example {@include ./examples.mdx}
 */
const AgentPrompt = Object.assign(
  function AgentPrompt(props: AgentPromptProps) {
    return <PromptCard {...props} />
  },
  { Permission: PermissionRequest, Question: QuestionPrompt, Plan: PlanApproval, Offer: Offer, Task: Task },
)

export type { AgentPromptProps, OfferProps, TaskProps }

export default AgentPrompt

export { AgentPrompt }
