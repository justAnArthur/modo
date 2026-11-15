/*!
 * Ported from Fluid Functionalism — github.com/mickadesign/fluid-functionalism
 * `registry/default/sidebar-menu.tsx` @ b3587bdbd83fc66c2a6aae3817ffb856cb09260b
 * MIT License © 2026 Micka Touillaud — fluidfunctionalism.com (notice: LICENSE.fluid-functionalism)
 * Local changes: see PORTING.md.
 */

import { Children, type ReactNode } from 'react'
import { cn } from '../../../lib/utils'
import { WeightLabel } from '../../../lib/weight-label'

/** A row's leading text and the element children after it (dots, counts, trailing icons). */
export function splitLabel(content: ReactNode): [text: string, rest: ReactNode[]] {
  const nodes = Children.toArray(content)
  let end = 0
  while (end < nodes.length && (typeof nodes[end] === 'string' || typeof nodes[end] === 'number')) end++
  return [nodes.slice(0, end).join(''), nodes.slice(end)]
}

/**
 * A menu row's label: the leading text changes weight without reflowing and
 * truncates; element children follow as flex siblings, outside the trimmed
 * text box (which would clip an inline SVG), where `ml-auto` reaches the
 * row's end.
 */
export function MenuRowLabel({
  content,
  lit,
  emphasized,
  textClass,
}: {
  content: ReactNode
  lit: boolean
  emphasized: boolean
  textClass: string
}) {
  const [label, rest] = splitLabel(content)

  if (!label) {
    return (
      <span
        className={cn(
          'flex min-w-0 flex-1 items-center gap-2 transition-colors duration-fast',
          lit ? 'text-foreground' : 'text-muted-foreground',
          textClass,
        )}
      >
        {content}
      </span>
    )
  }

  return (
    <>
      <WeightLabel emphasized={emphasized} lit={lit} trim truncate className={cn('text-left', textClass)}>
        {label}
      </WeightLabel>
      {rest}
    </>
  )
}
