/*!
 * Local addition: the AI app's inbox. Everything across sessions that needs
 * the user (a permission, a question or a plan waiting, a finished turn, a
 * failed CI run, a limit running out) in one list grouped by recency, each
 * row answered in place. The trigger is a bell with the unread count; the
 * list opens in a Popover that grows out of it.
 */

'use client'

import {
  FluidHoverHighlight,
  type UseFluidHoverReturn,
  useFluidHover,
  useRegisterFluidHoverItem,
} from '@justanarthur/modo-ui'
import Button from '@justanarthur/modo-ui/components/actions/button'
import StatusDot from '@justanarthur/modo-ui/components/feedback/status-dot'
import Popover from '@justanarthur/modo-ui/components/overlays/popover'
import { useShape } from '@justanarthur/modo-ui/lib/shape-context'
import { cn } from '@justanarthur/modo-ui/lib/utils'
import ScrollArea from '@justanarthur/modo-ui/primitives/layout/scroll-area'
import { SizeProvider } from '@justanarthur/modo-ui/primitives/systems/sizes'
import { type ReactElement, type ReactNode, useRef, useState } from 'react'
import { type IconName, useIcon } from '../../../lib/icons'

export type InboxKind = 'permission' | 'question' | 'plan' | 'finished' | 'ci-failed' | 'rate-limit'

/** What a row's buttons do: answer a permission, open the session, or move to a profile with room. */
export type InboxAction = 'allow' | 'deny' | 'open' | 'switch-profile'

export interface InboxItem {
  id: string
  kind: InboxKind
  /** What it is about: the command, the question, the PR's check. */
  title: string
  /** The session it came from. */
  sessionId: string
  session: string
  project?: string
  /** The profile it ran under; for a rate limit, the one running out. */
  profile?: string
  /** One more line: the tool, the reply's first line, the failing step. */
  detail?: string
  /** Minutes since it arrived; groups the list and reads as "3m", "2h", "1d". */
  ago: number
  read?: boolean
}

const KIND: Record<InboxKind, { icon: IconName; label: string; tone: string }> = {
  permission: { icon: 'shield', label: 'Permission', tone: 'text-status-warning' },
  question: { icon: 'message-circle', label: 'Question', tone: 'text-status-warning' },
  plan: { icon: 'list-checks', label: 'Plan to review', tone: 'text-status-warning' },
  finished: { icon: 'circle-check', label: 'Finished', tone: 'text-muted-foreground' },
  'ci-failed': { icon: 'circle-x', label: 'CI failed', tone: 'text-status-error' },
  'rate-limit': { icon: 'gauge', label: 'Limit', tone: 'text-status-warning' },
}

const GROUPS: { label: string; until: number }[] = [
  { label: 'Last hour', until: 60 },
  { label: 'Today', until: 60 * 24 },
  { label: 'Earlier', until: Number.POSITIVE_INFINITY },
]

function ago(minutes: number) {
  if (minutes < 1) return 'now'
  if (minutes < 60) return `${Math.round(minutes)}m`
  if (minutes < 60 * 24) return `${Math.round(minutes / 60)}h`
  return `${Math.round(minutes / 60 / 24)}d`
}

function Actions({ item, onAction }: { item: InboxItem; onAction: (action: InboxAction) => void }) {
  const button = (action: InboxAction, label: string, variant: 'secondary' | 'ghost' = 'ghost') => (
    <Button key={action} variant={variant} size="compact" onClick={() => onAction(action)}>
      {label}
    </Button>
  )
  if (item.kind === 'permission')
    return (
      <>
        {button('deny', 'Deny')}
        {button('allow', 'Allow', 'secondary')}
      </>
    )
  if (item.kind === 'rate-limit') return button('switch-profile', 'Switch profile', 'secondary')
  if (item.kind === 'question') return button('open', 'Answer', 'secondary')
  if (item.kind === 'plan') return button('open', 'Review', 'secondary')
  if (item.kind === 'ci-failed') return button('open', 'Open', 'secondary')
  return null
}

function Row({
  item,
  index,
  read,
  resolved,
  register,
  onAction,
}: {
  item: InboxItem
  index: number
  read: boolean
  resolved?: string
  register: UseFluidHoverReturn['registerItem']
  onAction: (action: InboxAction) => void
}) {
  const ref = useRef<HTMLDivElement | null>(null)
  const shape = useShape()
  const kind = KIND[item.kind]
  const Icon = useIcon(kind.icon)
  useRegisterFluidHoverItem(register, index, ref)

  return (
    <div
      ref={ref}
      className={cn(
        'relative z-10 flex items-start gap-[var(--space-3)] px-[var(--space-2)] py-[var(--space-2)]',
        shape.item,
      )}
    >
      <Icon size={16} strokeWidth={1.5} className={cn('mt-0.5 shrink-0', kind.tone)} />
      <div className="flex min-w-0 flex-1 flex-col gap-[var(--space-1)]">
        {/* The row opens its session; the buttons sit above this stretched target. */}
        <button
          type="button"
          onClick={() => onAction('open')}
          className='flex min-w-0 cursor-pointer flex-col text-left outline-none after:absolute after:inset-0 after:rounded-box after:content-[""] focus-visible:after:ring-1 focus-visible:after:ring-focus-ring'
        >
          <span className="flex min-w-0 items-baseline gap-[var(--space-2)]">
            <span
              className={cn('min-w-0 flex-1 truncate text-body', read ? 'text-muted-foreground' : 'text-foreground')}
            >
              {item.title}
            </span>
            <span className="shrink-0 text-caption tabular-nums text-muted-foreground">{ago(item.ago)}</span>
          </span>
          <span className="min-w-0 truncate text-caption text-muted-foreground">
            {[kind.label, item.session, item.project, item.profile].filter(Boolean).join(' · ')}
          </span>
          {item.detail && (
            <span className="min-w-0 truncate font-mono text-caption text-muted-foreground">{item.detail}</span>
          )}
        </button>
        {resolved ? (
          <span className="text-caption text-muted-foreground">{resolved}</span>
        ) : (
          <span className="relative z-20 flex items-center gap-[var(--space-1)] empty:hidden">
            <Actions item={item} onAction={onAction} />
          </span>
        )}
      </div>
      {!read && <StatusDot status="unread" label="Unread" size="compact" className="mt-0.5" />}
    </div>
  )
}

interface InboxListProps {
  /** Everything waiting on the user, newest first or in any order: rows sort by `ago`. */
  items: InboxItem[]
  /** Called when a row is answered or opened: allow / deny a permission, open its session, switch profile on a limit. */
  onAction?: (item: InboxItem, action: InboxAction) => void
  /** Called when Mark all read is pressed. */
  onMarkAllRead?: () => void
  /** Show the header with the title and Mark all read; turn it off in a pane that has its own. Defaults to `true`. */
  header?: boolean
  /** Classes for the root. */
  className?: string
}

/** The inbox's rows, grouped by recency, with the header's Mark all read. */
function InboxList({ items, onAction, onMarkAllRead, header = true, className }: InboxListProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const hover = useFluidHover(containerRef, { axis: 'y' })
  const shape = useShape()
  const Inbox = useIcon('inbox')
  const [allRead, setAllRead] = useState(false)
  const [readIds, setReadIds] = useState<string[]>([])
  const [resolved, setResolved] = useState<Record<string, string>>({})

  const sorted = [...items].sort((a, b) => a.ago - b.ago)
  const isRead = (item: InboxItem) => allRead || item.read || readIds.includes(item.id)
  const unread = sorted.filter(i => !isRead(i)).length

  const act = (item: InboxItem, action: InboxAction) => {
    setReadIds(ids => [...ids, item.id])
    if (action === 'allow') setResolved(r => ({ ...r, [item.id]: 'Allowed' }))
    if (action === 'deny') setResolved(r => ({ ...r, [item.id]: 'Denied' }))
    onAction?.(item, action)
  }

  let index = 0
  let lower = 0
  const groups: { label: string; rows: ReactNode[] }[] = []
  for (const group of GROUPS) {
    const rows = sorted
      .filter(i => i.ago >= lower && i.ago < group.until)
      .map(item => (
        <Row
          key={item.id}
          item={item}
          index={index++}
          read={isRead(item)}
          resolved={resolved[item.id]}
          register={hover.registerItem}
          onAction={action => act(item, action)}
        />
      ))
    lower = group.until
    if (rows.length > 0) groups.push({ label: group.label, rows })
  }

  return (
    <div className={cn('flex min-h-0 flex-1 flex-col gap-[var(--space-2)]', className)}>
      {header && (
        <div className="flex items-center gap-[var(--space-2)] pl-[var(--space-2)]">
          <span className="text-subtitle text-foreground">Inbox</span>
          {unread > 0 && <span className="text-caption tabular-nums text-muted-foreground">{unread} unread</span>}
          <Button
            variant="ghost"
            size="compact"
            className="ml-auto"
            disabled={unread === 0}
            onClick={() => {
              setAllRead(true)
              onMarkAllRead?.()
            }}
          >
            Mark all read
          </Button>
        </div>
      )}
      {sorted.length === 0 ? (
        <div className="flex flex-col items-center gap-[var(--space-1)] px-[var(--space-4)] py-[var(--space-6)] text-center">
          <Inbox size={20} strokeWidth={1.5} className="text-muted-foreground" />
          <span className="text-body text-foreground">Nothing needs you</span>
          <span className="text-caption text-muted-foreground">
            Waiting sessions, finished turns and failed checks land here.
          </span>
        </div>
      ) : (
        <ScrollArea className="min-h-0 flex-1" viewportClassName="scroll-fade">
          {/* Inline-size containment: the scroll content takes the pane's width, so long lines truncate instead of widening it. */}
          <div
            ref={containerRef}
            {...hover.handlers}
            className="@container relative flex flex-col gap-[var(--space-2)]"
          >
            <FluidHoverHighlight hover={hover} className={shape.bg} />
            {groups.map(group => (
              <section key={group.label} aria-label={group.label} className="flex flex-col">
                <span className="px-[var(--space-2)] pb-[var(--space-1)] text-caption text-muted-foreground">
                  {group.label}
                </span>
                {group.rows}
              </section>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  )
}

interface InboxProps {
  /** Everything waiting on the user. */
  items: InboxItem[]
  /** Called when a row is answered or opened: allow / deny a permission, open its session, switch profile on a limit. */
  onAction?: (item: InboxItem, action: InboxAction) => void
  /** Called when Mark all read is pressed. */
  onMarkAllRead?: () => void
  /** Controlled open state. */
  open?: boolean
  /** Initial open state. Defaults to `false`. */
  defaultOpen?: boolean
  /** Called when the panel opens or closes. */
  onOpenChange?: (open: boolean) => void
  /** Which side of the bell the panel opens on. Defaults to `'bottom'`. */
  side?: 'top' | 'right' | 'bottom' | 'left'
  /** Where the panel lines up along that side. Defaults to `'end'`. */
  align?: 'start' | 'center' | 'end'
  /** Replaces the bell (a sidebar row, say); it gets the unread count's label. */
  trigger?: ReactElement
  /** Classes for the bell. */
  className?: string
}

/**
 * Everything across sessions that needs you, behind a bell: permissions,
 * questions and plans waiting, finished turns, failed CI runs and limits
 * running out.
 *
 * The bell carries the unread count. Its panel grows out of it and lists the
 * items by recency (the last hour, today, earlier), each with where it came
 * from (the session, its project and profile) and what to do about it, in
 * place: allow or deny a permission, answer a question, review a plan, open
 * a failed check, switch to a profile with room. A press anywhere else on a
 * row opens its session, and the panel closes behind it. Mark all read clears
 * the count. `InboxList` is the list without the bell, for a pane or a page.
 *
 * Statics:
 * - `Inbox.List` — the list on its own: `items`, `onAction`, `onMarkAllRead`, `header`.
 *
 * @example {@include ./examples.mdx}
 */
const Inbox = Object.assign(
  function Inbox({
    items,
    onAction,
    onMarkAllRead,
    open,
    defaultOpen = false,
    onOpenChange,
    side = 'bottom',
    align = 'end',
    trigger,
    className,
  }: InboxProps) {
    const Bell = useIcon('bell')
    const [cleared, setCleared] = useState(false)
    const [ownOpen, setOwnOpen] = useState(defaultOpen)
    const shown = open ?? ownOpen
    const setShown = (next: boolean) => {
      setOwnOpen(next)
      onOpenChange?.(next)
    }
    const unread = cleared ? 0 : items.filter(i => !i.read).length

    return (
      <Popover open={shown} onOpenChange={setShown}>
        <Popover.Trigger
          render={
            trigger ?? (
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={unread > 0 ? `Inbox, ${unread} unread` : 'Inbox'}
                className={cn('relative', className)}
              >
                <Bell />
                {unread > 0 && (
                  <span
                    aria-hidden="true"
                    className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-micro tabular-nums text-background"
                  >
                    {unread > 9 ? '9+' : unread}
                  </span>
                )}
              </Button>
            )
          }
        />
        <Popover.Content
          side={side}
          align={align}
          sideOffset={8}
          className="flex max-h-[520px] w-96 flex-col p-[var(--space-2)]"
        >
          <SizeProvider size="default">
            <InboxList
              items={items}
              onAction={(item, action) => {
                onAction?.(item, action)
                // Opening a session takes you there: the popover would stand over it.
                if (action === 'open') setShown(false)
              }}
              onMarkAllRead={() => {
                setCleared(true)
                onMarkAllRead?.()
              }}
            />
          </SizeProvider>
        </Popover.Content>
      </Popover>
    )
  },
  { List: InboxList },
)

export type { InboxListProps, InboxProps }
export { Inbox, InboxList }

export default Inbox
