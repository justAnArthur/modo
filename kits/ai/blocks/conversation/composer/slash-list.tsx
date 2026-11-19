/*!
 * Local addition (not part of Fluid Functionalism): the slash-command list a
 * draft opens when it starts with "/". Focus stays in the textarea, which
 * drives the options (aria-activedescendant), as with the suggested prompts.
 */

'use client'

import Badge from '@justanarthur/modo-ui/components/data-display/badge'
import { useShape } from '@justanarthur/modo-ui/lib/shape-context'
import { useSize } from '@justanarthur/modo-ui/lib/size-context'
import { cn } from '@justanarthur/modo-ui/lib/utils'
import {
  FluidHoverHighlight,
  type UseFluidHoverReturn,
  useRegisterFluidHoverItem,
} from '@justanarthur/modo-ui/primitives/systems/fluid-hover'
import { type MutableRefObject, useRef } from 'react'
import type { SlashCommand } from './shared'

/** The command's name without its slash. */
export const bareName = (command: SlashCommand) => command.name.replace(/^\//, '')

/** The commands a typed `query` (after the slash) matches: names that start with it, then names that hold it. */
export function matchCommands(commands: SlashCommand[], query: string) {
  const q = query.toLowerCase()
  const starts = commands.filter(c => bareName(c).toLowerCase().startsWith(q))
  const holds = commands.filter(c => !starts.includes(c) && bareName(c).toLowerCase().includes(q))
  return [...starts, ...holds]
}

interface SlashRowProps {
  command: SlashCommand
  index: number
  optionId: string
  active: boolean
  registerItem: (index: number, element: HTMLElement | null) => void
  onPick: () => void
}

function SlashRow({ command, index, optionId, active, registerItem, onPick }: SlashRowProps) {
  const ref = useRef<HTMLDivElement>(null)
  const compactStep = useSize().variant === 'compact'
  useRegisterFluidHoverItem(registerItem, index, ref)
  return (
    // biome-ignore lint/a11y/useFocusableInteractive lint/a11y/useKeyWithClickEvents: focus stays in the textarea, which drives the options (aria-activedescendant).
    <div
      ref={ref}
      id={optionId}
      role="option"
      aria-selected={active}
      // Keeps focus in the textarea, so the pick lands where the caret was.
      onMouseDown={e => e.preventDefault()}
      onClick={onPick}
      className={cn(
        'relative flex cursor-pointer items-center gap-2 px-2',
        compactStep ? 'h-7 text-body-compact' : 'h-8 text-body',
      )}
    >
      <span className="shrink-0 text-foreground">/{bareName(command)}</span>
      {command.description && (
        <span className="min-w-0 flex-1 truncate text-caption text-muted-foreground">{command.description}</span>
      )}
      {command.kind && command.kind !== 'command' && (
        <Badge size="compact" color="gray" className="ml-auto shrink-0">
          {command.kind}
        </Badge>
      )}
    </div>
  )
}

interface SlashListProps {
  commands: SlashCommand[]
  listId: string
  hover: UseFluidHoverReturn
  listRef: MutableRefObject<HTMLDivElement | null>
  onPick: (command: SlashCommand) => void
}

/** The matching commands, at most eight rows tall, then scrolling; one fluid highlight runs down them. */
export function SlashList({ commands, listId, hover, listRef, onPick }: SlashListProps) {
  const shape = useShape()
  return (
    <div className="max-h-64 overflow-y-auto">
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: the textarea drives the list by keyboard (aria-activedescendant). */}
      <div
        ref={listRef}
        role="listbox"
        id={listId}
        aria-label="Commands"
        onMouseEnter={hover.handlers.onMouseEnter}
        onMouseMove={hover.handlers.onMouseMove}
        onMouseLeave={hover.handlers.onMouseLeave}
        onClick={hover.handlers.onClick}
        className="relative flex flex-col"
      >
        <FluidHoverHighlight hover={hover} className={shape.bg} />
        {commands.map((command, i) => (
          <SlashRow
            key={command.name}
            command={command}
            index={i}
            optionId={`${listId}-${i}`}
            active={i === hover.activeIndex}
            registerItem={hover.registerItem}
            onPick={() => onPick(command)}
          />
        ))}
      </div>
    </div>
  )
}
