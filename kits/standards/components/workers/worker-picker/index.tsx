/*!
 * Local addition: "Fix with ▾ worker", the action that hands failing cells
 * to a worker preset, with the preset picked from a menu beside it.
 */

'use client'

import ButtonGroup from '@justanarthur/modo-ui/components/actions/button-group'
import Dropdown from '@justanarthur/modo-ui/components/overlays/dropdown'
import Tooltip from '@justanarthur/modo-ui/components/overlays/tooltip'
import { useShape } from '@justanarthur/modo-ui/lib/shape-context'
import type { SizeVariant } from '@justanarthur/modo-ui/lib/size-context'
import { useControllableState } from '@justanarthur/modo-ui/lib/use-controllable-state'
import { cn } from '@justanarthur/modo-ui/lib/utils'
import { Wrench } from 'lucide-react'
import type { Worker } from '../../../lib/types'

const MODE: Record<Worker['permission_mode'], string> = {
  acceptEdits: 'edits',
  default: 'asks first',
  plan: 'plans only',
}

/** `sonnet · medium · edits`: what a preset runs and may do. */
export const workerSummary = (worker: Worker) =>
  [worker.model, worker.effort, MODE[worker.permission_mode]].filter(Boolean).join(' · ')

interface WorkerPickerProps {
  /** The worker presets to pick from, as in `workers.yml`. */
  workers: Worker[]
  /** The picked worker's id (controlled). Pair with `onValueChange`. */
  value?: string
  /** The worker picked at first, for an uncontrolled picker: the business's default. Defaults to the first preset. */
  defaultValue?: string
  /** Called with the id of the worker picked from the menu. */
  onValueChange?: (worker: string) => void
  /** Called with the picked worker's id on a press of Fix. */
  onFix?: (worker: string) => void
  /** How many cells the fix takes: `Fix 3 with`. Defaults to one, which leaves the number out. */
  count?: number
  /** `primary` for the view's main action, `secondary` beside another one. Defaults to `'primary'`. */
  variant?: 'primary' | 'secondary'
  /** Pins the buttons to one step of the size ladder (36px default, 28px compact). Defaults to the surrounding SizeProvider. */
  size?: SizeVariant
  /** Disables both buttons. Defaults to `false`. */
  disabled?: boolean
  /** Why it is disabled, shown in a tooltip over the whole split button while `disabled`. */
  disabledReason?: string
  /** Classes for the root. */
  className?: string
}

/**
 * Fix with ▾ worker: one press hands the failing cells to a worker; the
 * chevron attached to it picks which one.
 *
 * The button names the worker it will start (the business's default at
 * first) and, for a batch, how many cells go with it as one run and one PR.
 * The menu lists the presets from `workers.yml`, each with its model, effort
 * and what it may do (`edits`, or `plans only` for a preset that reads and
 * proposes), the picked one checked. It is modo-ui's split button (see
 * ButtonGroup). Works controlled (`value` +
 * `onValueChange`) or uncontrolled (`defaultValue`).
 *
 * `disabled` dims both segments; with a `disabledReason` the split button
 * gets a tooltip saying why, on hover and on keyboard focus.
 *
 * @example {@include ./examples.mdx}
 */
export default function WorkerPicker({
  workers,
  value,
  defaultValue = workers[0]?.id,
  onValueChange,
  onFix,
  count = 1,
  variant = 'primary',
  size,
  disabled = false,
  disabledReason,
  className,
}: WorkerPickerProps) {
  const [picked, setPicked] = useControllableState(value, defaultValue, onValueChange)
  const index = workers.findIndex(worker => worker.id === picked)
  const shape = useShape()
  const explained = disabled && disabledReason

  const group = (
    <ButtonGroup
      variant={variant}
      size={size}
      disabled={disabled}
      aria-label="Fix"
      className={explained ? undefined : className}
    >
      <ButtonGroup.Button leadingIcon={Wrench} disabled={disabled || !picked} onClick={() => picked && onFix?.(picked)}>
        {count > 1 ? `Fix ${count} with ${picked}` : `Fix with ${picked}`}
      </ButtonGroup.Button>
      <ButtonGroup.Menu
        label="Pick a worker"
        checkedIndex={index < 0 ? undefined : index}
        onCheckedIndexChange={next => next !== undefined && setPicked(workers[next]!.id)}
      >
        <Dropdown.Label>Workers</Dropdown.Label>
        {workers.map(worker => (
          <Dropdown.Item key={worker.id} label={worker.id} textValue={worker.id}>
            <span className="ml-auto pl-3 text-caption text-muted-foreground">{workerSummary(worker)}</span>
          </Dropdown.Item>
        ))}
      </ButtonGroup.Menu>
    </ButtonGroup>
  )

  if (!explained) return group

  return (
    <Tooltip content={disabledReason}>
      <span
        // biome-ignore lint/a11y/noNoninteractiveTabindex: disabled buttons take no pointer or focus, so the wrapper carries the reason
        tabIndex={0}
        className={cn(
          'inline-flex outline-none focus-visible:ring-1 focus-visible:ring-focus-ring',
          shape.button,
          className,
        )}
      >
        {group}
      </span>
    </Tooltip>
  )
}

export type { WorkerPickerProps }
export { WorkerPicker }
