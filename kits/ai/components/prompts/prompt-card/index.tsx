/*!
 * Local addition (not part of Fluid Functionalism): the lifted frame an
 * agent's prompts share — two surface levels up with a popup's shadow, a
 * glyph and one line of what is asked, the body, then hint and answers.
 */

'use client'

import Badge from '@justanarthur/modo-ui/components/data-display/badge'
import { useShape } from '@justanarthur/modo-ui/lib/shape-context'
import { cn } from '@justanarthur/modo-ui/lib/utils'
import Elevated from '@justanarthur/modo-ui/primitives/systems/surface'
import type { ReactNode } from 'react'
import { type IconName, useIcon } from '../../../lib/icons'

interface PromptCardProps {
  /** What is asked, in one line. */
  title: ReactNode
  /** A glyph from the icon set for the kind of prompt. Defaults to `'circle-alert'`. */
  icon?: IconName
  /** A chip after the title: the tool, the question's topic. */
  tag?: string
  /** The prompt's body: what will run, the options, the plan. */
  children?: ReactNode
  /** The answers, on the bottom row, the recommended one last. */
  actions?: ReactNode
  /** A muted hint on the bottom row's left: keys, scope. */
  hint?: ReactNode
  /** Classes for the frame. */
  className?: string
}

/**
 * A card for anything an agent stops to ask you mid-turn.
 *
 * The frame lifts two surface levels off whatever it sits on, with a
 * popup's shadow, so a waiting prompt reads as the thing to answer next: a
 * glyph and one line saying what is asked, an optional chip, the body, then
 * a muted hint and the answers on the bottom row. Everything sits on one
 * inset, so the title, the body's blocks (a command, a diff), the hint and
 * the answers share both edges; the body's blocks sit closer to each other
 * than to the title or the answers, and a hint too long for its row ends in
 * an ellipsis. Permission request,
 * Question prompt and Plan approval are built on it.
 *
 * @example {@include ./examples.mdx}
 */
export default function PromptCard({
  title,
  icon = 'circle-alert',
  tag,
  children,
  actions,
  hint,
  className,
}: PromptCardProps) {
  const shape = useShape()
  const Icon = useIcon(icon)
  return (
    <Elevated offset={2} shadowLevel={3} className={cn('flex min-w-0 flex-col gap-3 p-3', shape.container, className)}>
      <div className="flex min-w-0 items-start gap-2">
        {/* Centered on the title's first line (20px), however many it wraps to. */}
        <Icon size={16} strokeWidth={1.5} className="mt-0.5 shrink-0 text-muted-foreground" />
        <span className="min-w-0 text-body weight-medium text-foreground">{title}</span>
        {tag && (
          <Badge size="compact" color="gray" className="shrink-0">
            {tag}
          </Badge>
        )}
      </div>
      {children && <div className="flex min-w-0 flex-col gap-2">{children}</div>}
      {(actions || hint) && (
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          {hint && <span className="min-w-0 flex-1 truncate text-caption text-muted-foreground">{hint}</span>}
          <div className="ml-auto flex shrink-0 flex-wrap justify-end gap-2">{actions}</div>
        </div>
      )}
    </Elevated>
  )
}

export type { PromptCardProps }
export { PromptCard }
