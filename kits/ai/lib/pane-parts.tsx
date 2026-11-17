/*!
 * Local addition: the side pane's shared language. PaneSection is a
 * caption-sized title, its meta and icon actions on one row, the rows under
 * it on the control height with their own 8px inset; IconAction is an
 * icon-only ghost button with its label as a tooltip; PaneEmpty is what a
 * pane shows with nothing in it.
 */

'use client'

import Button from '@justanarthur/modo-ui/components/actions/button'
import EmptyState from '@justanarthur/modo-ui/components/feedback/empty-state'
import Tooltip from '@justanarthur/modo-ui/components/overlays/tooltip'
import { type ReactNode, useId } from 'react'
import { type IconComponent, type IconName, useIcon } from './icons'

/** A titled group: the title, its meta and its icon actions on one row, the rows under it. */
export function PaneSection({
  title,
  meta,
  actions,
  children,
}: {
  title: ReactNode
  meta?: ReactNode
  actions?: ReactNode
  children?: ReactNode
}) {
  const id = useId()
  return (
    <section aria-labelledby={id} className="flex flex-col">
      <div className="flex h-9 items-center gap-2 px-2 text-caption text-muted-foreground">
        {/* Not a heading: the docs' table of contents collects every h1–h3 on the page. */}
        <span id={id} className="min-w-0 truncate weight-medium text-foreground">
          {title}
        </span>
        {meta && <span className="min-w-0 truncate tabular-nums">{meta}</span>}
        {actions && <div className="-mr-1 ml-auto flex shrink-0 items-center gap-0.5">{actions}</div>}
      </div>
      {children}
    </section>
  )
}

/** An icon-only ghost button with its label as a tooltip. */
export function IconAction({
  icon: Icon,
  label,
  pressed,
  onClick,
}: {
  icon: IconComponent
  label: string
  pressed?: boolean
  onClick?: () => void
}) {
  return (
    <Tooltip content={label} side="bottom">
      <Button
        variant="ghost"
        size="icon-compact"
        aria-label={label}
        aria-pressed={pressed}
        active={pressed}
        onClick={onClick}
      >
        <Icon />
      </Button>
    </Tooltip>
  )
}

/** What a pane shows with nothing in it: a glyph, a line and what to do next. */
export function PaneEmpty({ icon, title, detail }: { icon: IconName; title: string; detail: string }) {
  return <EmptyState size="compact" icon={useIcon(icon)} title={title} description={detail} />
}
