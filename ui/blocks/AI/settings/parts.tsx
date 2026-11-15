/*!
 * Local addition: the settings sections' shared row language. Plain lists
 * (no frames) pulled back by their rows' padding so text lines up with the
 * section heading; a label with a caption on the left, its state or control
 * on the right. Toggles are a Switch.Group; anything with more to it is an
 * Accordion.Group row that lifts into a card with its config, as the
 * session board's rows do.
 */

'use client'

import { createContext, type ReactNode, useContext, useState } from 'react'
import Accordion from '../../../components/accordion'
import Switch from '../../../components/inputs/switch'
import { useShape } from '../../../lib/shape-context'
import { SURFACE_BG, SURFACE_SHADOW } from '../../../lib/surface-classes'
import { SurfaceProvider, useSurface } from '../../../lib/surface-context'
import { cn } from '../../../lib/utils'
import Code from '../../../primitives/code'

export function Section({
  title,
  lead,
  actions,
  children,
}: {
  title: string
  lead: string
  actions?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="flex flex-col gap-[var(--space-5)]">
      <div className="flex items-start gap-[var(--space-3)]">
        <div className="flex min-w-0 flex-1 flex-col gap-[var(--space-1)]">
          <h1 className="m-0 text-title text-foreground">{title}</h1>
          <p className="m-0 max-w-2xl text-body text-muted-foreground">{lead}</p>
        </div>
        {actions && <div className="flex shrink-0 gap-[var(--space-2)]">{actions}</div>}
      </div>
      <div className="flex flex-col gap-[var(--space-5)]">{children}</div>
    </section>
  )
}

/** A captioned run of rows inside a section. */
export function Group({ title, aside, children }: { title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <section aria-label={title} className="flex flex-col gap-[var(--space-1)]">
      <div className="flex items-baseline justify-between gap-[var(--space-2)] text-caption text-muted-foreground">
        <span>{title}</span>
        {aside}
      </div>
      {children}
    </section>
  )
}

/** Switch rows, unframed; pulled back by the rows' px-4 so labels line up with the heading. */
export function Toggles({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="-mx-4">
      <Switch.Group aria-label={label} className="w-full border-0">
        {children}
      </Switch.Group>
    </div>
  )
}

const OpenRows = createContext<string[]>([])

// Literal pairs, so UnoCSS sees them: the slot's width and the trigger's room for it.
const ACTION_SLOTS = {
  // Narrow, a button folds to its icon.
  button: { slot: 'w-8 @md:w-28', room: 'pr-12 @md:pr-32' },
  icon: { slot: 'w-8', room: 'pr-12' },
} as const

type ActionKind = keyof typeof ACTION_SLOTS

const ActionSlot = createContext<ActionKind | undefined>(undefined)

/** Rows that open into a card with their config. `actions` keeps a slot at every row's end, so the chevrons line up. */
export function Details({
  label,
  actions,
  defaultOpen = [],
  children,
}: {
  label: string
  actions?: ActionKind
  defaultOpen?: string[]
  children: ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <OpenRows.Provider value={open}>
      <ActionSlot.Provider value={actions}>
        <div className="-mx-4">
          <Accordion.Group
            type="multiple"
            value={open}
            onValueChange={setOpen}
            highlight="trigger"
            aria-label={label}
            className="w-full max-w-none"
          >
            {children}
          </Accordion.Group>
        </div>
      </ActionSlot.Provider>
    </OpenRows.Provider>
  )
}

/** Visible on hover or focus of its row, always on touch. */
export const ON_HOVER =
  'opacity-0 transition-opacity duration-fast group-hover/row:opacity-100 focus-within:opacity-100 pointer-coarse:opacity-100'

export function Row({
  value,
  index,
  label,
  caption,
  meta,
  action,
  children,
}: {
  value: string
  index: number
  label: ReactNode
  caption?: ReactNode
  /** State on the row's right: a badge, a size. */
  meta?: ReactNode
  /** A control beside the trigger, in the list's action slot. */
  action?: ReactNode
  /** The card's body when the row is open. */
  children: ReactNode
}) {
  const open = useContext(OpenRows).includes(value)
  const slot = useContext(ActionSlot)
  const shape = useShape()
  const substrate = useSurface()
  const level = Math.min(substrate + 2, 8)

  return (
    <Accordion.Item
      value={value}
      index={index}
      className={cn(
        // Open, the row lifts into a card; margin and padding cancel out sideways, so the row holds still.
        'group/row transition-[margin,padding,background-color,box-shadow] duration-moderate',
        open && ['-mx-1 my-[var(--space-2)] p-1', SURFACE_BG[level], SURFACE_SHADOW[3], shape.container],
      )}
    >
      <SurfaceProvider value={open ? level : substrate}>
        <div className="relative">
          <Accordion.Trigger
            className={cn(
              'px-4 py-2.5 [&>span:first-child]:min-w-0 [&>span:first-child]:grid-cols-[minmax(0,1fr)]',
              slot && ACTION_SLOTS[slot].room,
            )}
          >
            <span className="flex min-w-0 items-center gap-[var(--space-3)]">
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="truncate weight-medium text-foreground">{label}</span>
                {caption && (
                  <span className="truncate text-caption weight-normal text-muted-foreground">{caption}</span>
                )}
              </span>
              {meta && (
                <span className="flex shrink-0 items-center gap-[var(--space-3)] weight-normal text-muted-foreground">
                  {meta}
                </span>
              )}
            </span>
          </Accordion.Trigger>
          {slot && (
            // Beside the trigger, not in it: a press here never toggles the row.
            <div
              className={cn('absolute inset-y-0 right-4 z-20 flex items-center justify-end', ACTION_SLOTS[slot].slot)}
            >
              {action}
            </div>
          )}
        </div>
        <Accordion.Content>
          <div className="flex flex-col gap-[var(--space-3)] px-1 pt-[var(--space-1)]">{children}</div>
        </Accordion.Content>
      </SurfaceProvider>
    </Accordion.Item>
  )
}

/** An open row's config: a caption label on the left, its value on the right. */
export function Facts({ items }: { items: [string, ReactNode][] }) {
  return (
    <dl className="m-0 grid grid-cols-[minmax(0,6rem)_minmax(0,1fr)] items-baseline gap-x-[var(--space-4)] gap-y-[var(--space-2)] text-body">
      {items.map(([term, value]) => (
        <div key={term} className="contents">
          <dt className="text-caption text-muted-foreground">{term}</dt>
          <dd className="m-0 min-w-0 break-words text-foreground">{value}</dd>
        </div>
      ))}
    </dl>
  )
}

/** Code inside an open row's card: a sunken well, since in light every surface from the card up is white. */
export function CardCode({ language, children }: { language: string; children: string }) {
  return (
    <Code language={language} className="bg-sunken">
      {children}
    </Code>
  )
}

export function Mono({ children }: { children: ReactNode }) {
  return <span className="font-mono text-caption">{children}</span>
}

/** The card's last line: where the setting lives, and what you can do to it. */
export function Footer({ source, children }: { source: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-[var(--space-2)]">
      <span className="min-w-0 flex-1 truncate text-caption text-muted-foreground">
        In <span className="font-mono">{source}</span>
      </span>
      <div className="flex shrink-0 gap-[var(--space-1)]">{children}</div>
    </div>
  )
}
