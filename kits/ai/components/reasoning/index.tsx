/*!
 * Local addition (not part of Fluid Functionalism): a model's reasoning,
 * folded to one "Thought for 8s" row on an Accordion. Generalised from the AI
 * app's transcript.
 */

'use client'

import Accordion from '@justanarthur/modo-ui/components/accordion'
import type { ReactNode } from 'react'

interface ReasoningProps {
  /** How long it thought, shown in the row: `"12s"`. */
  duration: string
  /** The reasoning text, folded until opened. */
  children: ReactNode
  /** Start unfolded. Defaults to `false`. */
  defaultOpen?: boolean
}

/**
 * The reasoning behind a reply, folded to one row: "Thought for 12s".
 *
 * Press the row and the reasoning morphs out of it (see Accordion), set in
 * the muted color behind a hairline so it reads as an aside, not the answer.
 * The row sits flush with the text around it: its hover fill reaches into
 * the margin instead of indenting the label.
 *
 * @example {@include ./examples.mdx}
 */
function Reasoning({ duration, children, defaultOpen = false }: ReasoningProps) {
  return (
    <Accordion
      type="single"
      collapsible
      defaultValue={defaultOpen ? 'reasoning' : undefined}
      className="-mx-3 w-auto max-w-none"
    >
      <Accordion.Item value="reasoning">
        <Accordion.Trigger>Thought for {duration}</Accordion.Trigger>
        <Accordion.Content>
          <div className="flex flex-col gap-2 border-l border-border pl-[var(--space-3)] text-body text-muted-foreground">
            {children}
          </div>
        </Accordion.Content>
      </Accordion.Item>
    </Accordion>
  )
}

export type { ReasoningProps }
export { Reasoning }

export default Reasoning
