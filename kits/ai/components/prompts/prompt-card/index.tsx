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
import { type KeyboardEvent, type ReactNode, type RefObject, useEffect, useRef } from 'react'
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
  /** Takes focus when it appears, unless you are typing elsewhere: the element marked `data-autofocus`, else the card. Focus goes back where it was when the card leaves. */
  autoFocus?: boolean
  /** Called on Escape while focus is in the card. */
  onEscape?: () => void
  /** Keys pressed in the card, after its Escape. */
  onKeyDown?: (event: KeyboardEvent<HTMLDivElement>) => void
}

const FOCUSABLE = 'button:not([disabled]), input, textarea, [tabindex="0"]'

/** A text field with something in it has focus: a prompt that takes focus then would take your typing. */
function typing() {
  const active = document.activeElement
  if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement) return active.value !== ''
  return active instanceof HTMLElement && active.isContentEditable && active.textContent !== ''
}

/** Focuses the card's `data-autofocus` element (or the first control in it), else the card, and restores focus when it leaves. */
function useAutoFocus(card: RefObject<HTMLDivElement | null>, on: boolean) {
  useEffect(() => {
    const root = card.current
    if (!on || !root || typing()) return
    const before = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const marked = root.querySelector<HTMLElement>('[data-autofocus]')
    const target = marked?.matches(FOCUSABLE) ? marked : (marked?.querySelector<HTMLElement>(FOCUSABLE) ?? root)
    target.focus({ preventScroll: true })
    return () => {
      // Answered: the focused control left with the card.
      if (before?.isConnected && (document.activeElement === document.body || root.contains(document.activeElement)))
        before.focus({ preventScroll: true })
    }
  }, [on])
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
  autoFocus = false,
  onEscape,
  onKeyDown,
}: PromptCardProps) {
  const shape = useShape()
  const Icon = useIcon(icon)
  const card = useRef<HTMLDivElement>(null)
  useAutoFocus(card, autoFocus)
  return (
    <Elevated
      ref={card}
      tabIndex={-1}
      onKeyDown={event => {
        if (event.key === 'Escape' && onEscape) {
          event.preventDefault()
          event.stopPropagation()
          return onEscape()
        }
        onKeyDown?.(event)
      }}
      offset={2}
      shadowLevel={3}
      className={cn('flex min-h-0 min-w-0 flex-col gap-3 p-3 outline-none', shape.container, className)}
    >
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
      {children && <div className="flex min-h-0 min-w-0 flex-col gap-2">{children}</div>}
      {(actions || hint) && (
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          {hint && <span className="min-w-0 flex-1 truncate text-caption text-muted-foreground">{hint}</span>}
          {/* Shrinks to the row so its answers wrap in a narrow card, rather than run past its edge. */}
          <div className="ml-auto flex min-w-0 flex-wrap justify-end gap-2">{actions}</div>
        </div>
      )}
    </Elevated>
  )
}

export type { PromptCardProps }
export { PromptCard }
