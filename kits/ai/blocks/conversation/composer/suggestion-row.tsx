/*!
 * Ported from Fluid Functionalism — github.com/mickadesign/fluid-functionalism
 * `registry/default/input-message.tsx` @ b3587bdbd83fc66c2a6aae3817ffb856cb09260b
 * MIT License © 2026 Micka Touillaud (notice: LICENSE.fluid-functionalism). Local changes: see ui/PORTING.md.
 */

'use client'

import { useIcon } from '@justanarthur/modo-ui/lib/icon-context'
import { useSize } from '@justanarthur/modo-ui/lib/size-context'
import { cn } from '@justanarthur/modo-ui/lib/utils'
import { useRegisterFluidHoverItem } from '@justanarthur/modo-ui/primitives/systems/fluid-hover'
import { useRef } from 'react'

interface SuggestionRowProps {
  text: string
  index: number
  active: boolean
  /** Show a ↓ hint in the icon slot: the first row does while nothing is highlighted. */
  keyHint: boolean
  optionId: string
  registerItem: (index: number, element: HTMLElement | null) => void
  onSelect: () => void
}

/** A suggested prompt. The highlight is the list's sliding overlay; the row only recolors its text. */
function SuggestionRow({ text, index, active, keyHint, optionId, registerItem, onSelect }: SuggestionRowProps) {
  const EnterIcon = useIcon('corner-down-left')
  const ArrowDownIcon = useIcon('arrow-down')
  const compactStep = useSize().variant === 'compact'
  const ref = useRef<HTMLDivElement>(null)

  useRegisterFluidHoverItem(registerItem, index, ref)

  return (
    // biome-ignore lint/a11y/useFocusableInteractive lint/a11y/useKeyWithClickEvents: focus stays in the textarea, which drives the options (aria-activedescendant).
    <div
      ref={ref}
      id={optionId}
      role="option"
      aria-selected={active}
      onClick={onSelect}
      className={cn(
        'relative flex cursor-pointer items-center gap-2',
        compactStep ? 'h-7 px-2 text-subtitle-compact' : 'h-8 px-2.5 text-subtitle',
        'text-muted-foreground transition-colors duration-fast',
        active && 'text-foreground',
        'weight-normal',
      )}
    >
      <span className="min-w-0 flex-1 truncate text-trim py-1 -my-1">{text}</span>
      {!active && keyHint ? (
        <ArrowDownIcon size={13} className="shrink-0 text-muted-foreground/70 transition-opacity duration-fast" />
      ) : (
        <EnterIcon
          size={13}
          className={cn('shrink-0 transition-opacity duration-fast', active ? 'opacity-100' : 'opacity-0')}
        />
      )}
    </div>
  )
}

export { SuggestionRow }
