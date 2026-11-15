/*!
 * Local addition: the pieces the usage concepts share — a pace bar (the used
 * share with a tick where an even spend would be, colored by verdict), a
 * runway line (the time until the reset, filled as far as the budget lasts)
 * and the frame that puts a glance in a Sidebar row opening its detail.
 */

'use client'

import type { ReactNode } from 'react'
import Sidebar from '../../../components/navigation/sidebar'
import Popover from '../../../components/overlays/popover'
import { useShape } from '../../../lib/shape-context'
import { cn } from '../../../lib/utils'
import { SizeProvider } from '../../../primitives/sizes'
import Elevated from '../../../primitives/surface'
import { type LimitPace, VERDICT_FILL } from '../pace'
import { Fill, PaceBar } from '../pace-bar'
import { POPOVER_FRAME } from '../popover-rows'

export { PaceBar }

/** How much of the time until the reset the budget covers at this pace: full when it lasts, amber when only just. */
export function RunwayLine({ pace, className }: { pace: LimitPace; className?: string }) {
  const covered = pace.runsOutInHours / pace.window.resetsInHours
  return (
    <span aria-hidden="true" className={cn('relative block h-1 overflow-hidden rounded-full bg-active', className)}>
      <Fill share={covered} className={VERDICT_FILL[pace.verdict]} />
    </span>
  )
}

export interface UsageFrameProps {
  /** `sidebar`: the glance in a Sidebar row whose press opens the detail; `detail`: the detail on its own, as the popover draws it. */
  form: 'sidebar' | 'detail'
  /** The row's accessible name. */
  label: string
  glance: ReactNode
  detail: ReactNode
  /** Classes for the row (a two-line glance sets its height). */
  rowClassName?: string
}

export function UsageFrame({ form, label, glance, detail, rowClassName }: UsageFrameProps) {
  const shape = useShape()

  if (form === 'detail') {
    return (
      <Elevated offset={2} shadowLevel={3} className={cn('flex flex-col', POPOVER_FRAME, shape.container)}>
        <SizeProvider size="default">{detail}</SizeProvider>
      </Elevated>
    )
  }

  return (
    <Sidebar.Menu aria-label="Profile usage">
      <Sidebar.MenuItem>
        <Popover>
          <Popover.Trigger
            render={
              <Sidebar.MenuButton size="lg" aria-label={label} className={rowClassName}>
                {glance}
              </Sidebar.MenuButton>
            }
          />
          <Popover.Content side="right" align="end" sideOffset={12} className={POPOVER_FRAME}>
            <SizeProvider size="default">{detail}</SizeProvider>
          </Popover.Content>
        </Popover>
      </Sidebar.MenuItem>
    </Sidebar.Menu>
  )
}
