/*!
 * Local addition (not part of Fluid Functionalism): an agent's plan, waiting
 * for approval — the plan as prose, a feedback field and three decisions.
 */

'use client'

import Button from '@justanarthur/modo-ui/components/actions/button'
import { MarkdownProse } from '@justanarthur/modo-ui/components/data-display/markdown'
import Textarea from '@justanarthur/modo-ui/components/inputs/textarea'
import ScrollArea from '@justanarthur/modo-ui/primitives/layout/scroll-area'
import { type ReactNode, useState } from 'react'
import PromptCard from '../prompt-card'

type PlanDecision = 'auto' | 'review' | 'keep-planning'

interface PlanApprovalProps {
  /** The plan, as rendered markdown. */
  children: ReactNode
  /** What is asked, in one line. Defaults to `'Ready to code? Here is the plan.'`. */
  title?: ReactNode
  /** A chip after the title. Defaults to `'Plan mode'`. */
  tag?: string
  /** The feedback field's placeholder. Defaults to `'Tell the agent what to change'`. */
  placeholder?: string
  /** Called with the decision and any feedback. */
  onDecide?: (decision: PlanDecision, feedback: string) => void
  /** Takes focus in the feedback field when it appears, unless you are typing elsewhere. */
  autoFocus?: boolean
}

/**
 * A plan the agent wrote, waiting for your go-ahead.
 *
 * The plan reads as Prose in a scrolling frame that fades at its edges,
 * with a feedback field under it. The decisions sit on the bottom row:
 * keep planning with the feedback, approve and review each edit, or approve
 * with edits accepted. Escape, or ⌘Enter in the field, keeps planning with
 * the feedback. On a short window the plan's frame gives up height first.
 *
 * @example {@include ./examples.mdx}
 */
export default function PlanApproval({
  children,
  title = 'Ready to code? Here is the plan.',
  tag = 'Plan mode',
  placeholder = 'Tell the agent what to change',
  onDecide,
  autoFocus,
}: PlanApprovalProps) {
  const [feedback, setFeedback] = useState('')
  const keepPlanning = () => onDecide?.('keep-planning', feedback)
  return (
    <PromptCard
      autoFocus={autoFocus}
      onEscape={keepPlanning}
      onKeyDown={event => {
        if (
          event.key !== 'Enter' ||
          !(event.metaKey || event.ctrlKey) ||
          !(event.target instanceof HTMLTextAreaElement)
        )
          return
        event.preventDefault()
        keepPlanning()
      }}
      icon="list-checks"
      title={title}
      tag={tag}
      hint="Esc keeps planning"
      actions={
        <>
          <Button size="compact" variant="ghost" onClick={keepPlanning}>
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
      <ScrollArea className="max-h-72 min-h-0 rounded-xl border border-border" viewportClassName="scroll-fade">
        <MarkdownProse className="p-[var(--space-3)]">{children}</MarkdownProse>
      </ScrollArea>
      <div data-autofocus className="flex shrink-0 flex-col">
        <Textarea minRows={1} maxRows={4} value={feedback} onValueChange={setFeedback} placeholder={placeholder} />
      </div>
    </PromptCard>
  )
}

export type { PlanApprovalProps, PlanDecision }
export { PlanApproval }
