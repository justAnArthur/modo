/*!
 * Local addition (not part of Fluid Functionalism): an AI's plan for the task
 * at hand, pinned under the conversation, with the step in progress turning.
 * Folds to one row. Generalised from the AI app's transcript.
 */

'use client'

import Button from '@justanarthur/modo-ui/components/actions/button'
import { Spinner } from '@justanarthur/modo-ui/components/feedback/progress'
import { useShape } from '@justanarthur/modo-ui/lib/shape-context'
import { cn } from '@justanarthur/modo-ui/lib/utils'
import { useState } from 'react'
import { useIcon } from '../../../lib/icons'

type TodoStatus = 'pending' | 'in_progress' | 'completed'

interface TodoItem {
  /** The step, in a few words. */
  content: string
  /** Where it stands. */
  status: TodoStatus
}

interface TodoListProps {
  /** The plan, in order. */
  items: TodoItem[]
  /** The header's label. Defaults to `'Tasks'`. */
  title?: string
  /** Start with every step showing; folded, the header names the step in progress. Defaults to `true`. */
  defaultOpen?: boolean
}

/**
 * An AI's plan, pinned where you can see it: every step, done, in progress
 * or still to come.
 *
 * Done steps take a check and the muted color, the step in progress the
 * Spinner and medium weight, the steps to come an empty ring. The header
 * counts the done steps; its chevron folds the list to that one row, which
 * then names the step in progress.
 *
 * @example {@include ./examples.mdx}
 */
function TodoList({ items, title = 'Tasks', defaultOpen = true }: TodoListProps) {
  const shape = useShape()
  const [open, setOpen] = useState(defaultOpen)
  const Check = useIcon('check')
  const Chevron = useIcon('chevron-up')
  const done = items.filter(i => i.status === 'completed').length
  const current = items.find(i => i.status === 'in_progress')

  return (
    <section
      aria-label={title}
      className={cn('flex flex-col gap-1 border border-border p-[var(--space-3)]', shape.container)}
    >
      <div className="flex min-w-0 items-center gap-2 text-caption">
        <span className="shrink-0 weight-medium text-foreground">{title}</span>
        {!open && current && <span className="min-w-0 truncate text-muted-foreground">{current.content}</span>}
        <span className="ml-auto shrink-0 tabular-nums text-muted-foreground">
          {done} of {items.length}
        </span>
        <Button
          variant="ghost"
          size="icon-compact"
          aria-label={open ? 'Fold the list' : 'Show every step'}
          aria-expanded={open}
          className="-mr-1.5 size-6"
          onClick={() => setOpen(!open)}
        >
          <Chevron className={cn('transition-transform duration-fast', !open && 'rotate-180')} />
        </Button>
      </div>
      <ol className={cn('m-0 flex flex-col p-0', !open && 'hidden')}>
        {items.map(item => (
          <li key={item.content} className="flex min-h-6 items-center gap-2 text-body">
            <span className="flex size-4 shrink-0 items-center justify-center">
              {item.status === 'in_progress' ? (
                <Spinner className="size-3.5" />
              ) : item.status === 'completed' ? (
                <Check size={14} strokeWidth={2} className="text-muted-foreground" />
              ) : (
                <span className="size-2.5 rounded-full border border-muted-foreground" />
              )}
            </span>
            <span
              className={cn(
                'min-w-0 truncate',
                item.status === 'in_progress' ? 'weight-medium text-foreground' : 'text-muted-foreground',
                item.status === 'pending' && 'text-foreground',
              )}
            >
              {item.content}
            </span>
          </li>
        ))}
      </ol>
    </section>
  )
}

export type { TodoItem, TodoListProps, TodoStatus }
export { TodoList }

export default TodoList
