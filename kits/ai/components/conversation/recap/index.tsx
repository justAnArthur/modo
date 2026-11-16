/*!
 * Local addition (not part of Fluid Functionalism): the box an AI closes its
 * work with — a short recap and, when you have a decision to make, one
 * question with its answers. Generalised from the AI app's transcript.
 */

'use client'

import Button from '@justanarthur/modo-ui/components/actions/button'
import { useShape } from '@justanarthur/modo-ui/lib/shape-context'
import { cn } from '@justanarthur/modo-ui/lib/utils'
import { useIcon } from '../../../lib/icons'

interface RecapProps {
  /** Two or three sentences: what is now true, what is not done or not verified. */
  recap: string
  /** The one decision left to you, if any. */
  ask?: string
  /** One or two answers to `ask`; the first is the recommendation. Defaults to `[]`. */
  actions?: string[]
  /** Called with the picked answer. */
  onAction?: (label: string) => void
}

/**
 * Where a piece of work landed: what changed, what is left, and the one
 * decision that waits on you.
 *
 * The recap reads in the muted color on the muted fill. With an `ask`, the
 * question follows in medium weight with up to two answers beside it, the
 * recommendation first as the primary button. Without one it is the recap
 * alone: nothing waits on you.
 *
 * @example {@include ./examples.mdx}
 */
function Recap({ recap, ask, actions = [], onAction }: RecapProps) {
  const shape = useShape()
  const Flag = useIcon('corner-down-right')
  return (
    <section aria-label="Recap" className={cn('flex flex-col gap-3 bg-muted p-[var(--space-3)]', shape.container)}>
      <p className="m-0 text-body text-muted-foreground">{recap}</p>
      {ask && (
        <div className="flex flex-wrap items-center gap-2">
          <Flag size={16} strokeWidth={1.5} className="shrink-0 text-muted-foreground" />
          <span className="min-w-0 flex-1 text-body weight-medium text-foreground">{ask}</span>
          <div className="flex shrink-0 gap-2">
            {actions.slice(0, 2).map((label, i) => (
              <Button
                key={label}
                size="compact"
                variant={i === 0 ? 'primary' : 'tertiary'}
                onClick={() => onAction?.(label)}
              >
                {label}
              </Button>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}

export type { RecapProps }
export { Recap }

export default Recap
