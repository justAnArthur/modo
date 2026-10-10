/*
 * Local addition (not part of Fluid Functionalism): the Craft page, a docs
 * stage in the spirit of fluidfunctionalism.com/docs/skill's before/after
 * pairs. Each comparison puts the naive version (`./demos.tsx`, rules broken
 * on purpose) next to the system's own items.
 */

import type { ReactNode } from 'react'
import Badge from '../../components/badge'
import { useShape } from '../../lib/shape-context'
import { cn } from '../../lib/utils'

interface PaneProps {
  verdict: 'bad' | 'good'
  note?: string
  children: ReactNode
}

function Pane({ verdict, note, children }: PaneProps) {
  const shape = useShape()

  return (
    // A subgrid, so both panes share the stage and caption rows and their stages line up.
    <figure className={cn('row-span-2 m-0 grid min-w-0 grid-rows-subgrid gap-0 ring-1 ring-border', shape.container)}>
      <div className="flex min-h-40 items-center justify-center p-4">{children}</div>
      <figcaption className="flex items-start gap-2 border-t border-border px-4 py-3">
        <Badge variant="dot" size="compact" color={verdict === 'bad' ? 'red' : 'green'}>
          {verdict === 'bad' ? 'Bad' : 'Good'}
        </Badge>
        {note && <span className="text-caption text-muted-foreground">{note}</span>}
      </figcaption>
    </figure>
  )
}

interface CraftProps {
  /** The naive version: the same interface with the detail missing. */
  bad: ReactNode
  /** The system's version, with the detail in place. */
  good: ReactNode
  /** What goes wrong on the bad side, in one line. */
  badNote?: string
  /** What the good side does instead, in one line. */
  goodNote?: string
  /** Classes for the root grid. */
  className?: string
}

/**
 * The details that make an interface feel finished, each one shown without
 * and with it.
 *
 * Every pair below isolates one rule of the system: the bad side is the
 * version most component libraries ship, the good side is this design
 * system's own item. Try both: press, hover between rows, click and then tab,
 * open and close. The rules themselves are on the Motion, FluidHover,
 * Morph, Elevated and SizeProvider pages; this one is where they can be felt.
 * `Craft` is the frame: the two versions side by side, each with a one-line
 * verdict, stacked on narrow screens.
 *
 * @example {@include ./examples.mdx}
 */
export default function Craft({ bad, good, badNote, goodNote, className }: CraftProps) {
  return (
    <div className={cn('grid w-full gap-3 sm:grid-cols-2', className)}>
      <Pane verdict="bad" note={badNote}>
        {bad}
      </Pane>
      <Pane verdict="good" note={goodNote}>
        {good}
      </Pane>
    </div>
  )
}

export type { CraftProps }
