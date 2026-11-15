/*!
 * Local addition: the agent desktop's sessions board — every session of
 * every project and profile at once, one compact row each, sorted by what it
 * needs from you (needs you, running, to review, idle) or grouped by project.
 * Each row answers, stops or replies in place (a reply is an InputMessage in
 * a Popover), so a session rarely needs opening.
 */

'use client'

import InputMessage from '../../../components/AI/input-message'
import Badge from '../../../components/badge'
import Button from '../../../components/button'
import Meter from '../../../components/meter'
import TabsSubtle from '../../../components/navigation/tabs-subtle'
import Popover from '../../../components/overlays/popover'
import Table from '../../../components/table'
import { useIcon } from '../../../lib/icon-context'
import { useShape } from '../../../lib/shape-context'
import { useControllableState } from '../../../lib/use-controllable-state'
import { cn } from '../../../lib/utils'
import FluidHover from '../../../primitives/fluid-hover'
import { SizeProvider } from '../../../primitives/sizes'
import { GROUPS, PINNED, PROFILES, type Session, type SessionGroup, type SessionStatus } from '../mock'
import { ProfileTile } from '../profile-switcher'
import { STATUS_GLYPH } from '../status-glyph'

interface BoardSession extends Session {
  projectLabel: string
}

/** Every session once, with its project; linked children ride with their parent's project. */
function flatten(pinned: Session[], groups: SessionGroup[]): BoardSession[] {
  const seen = new Set<string>()
  const out: BoardSession[] = []
  const add = (s: Session, projectLabel: string) => {
    if (seen.has(s.id)) return
    seen.add(s.id)
    out.push({ ...s, projectLabel })
    for (const child of s.children ?? []) add(child, projectLabel)
  }
  for (const s of pinned) add(s, s.project ?? 'Pinned')
  for (const g of groups) for (const s of g.sessions) add(s, g.label)
  return out
}

const COLUMNS: { status: SessionStatus; label: string }[] = [
  { status: 'waiting', label: 'Needs you' },
  { status: 'running', label: 'Running' },
  { status: 'unread', label: 'To review' },
  { status: 'idle', label: 'Idle' },
]

function StatusDot({ status }: { status: SessionStatus }) {
  const Glyph = STATUS_GLYPH[status]
  if (Glyph) return <Glyph size={14} />
  return (
    <span className="flex size-3.5 shrink-0 items-center justify-center">
      <span
        className={cn('size-2 rounded-full', status === 'unread' ? 'bg-foreground' : 'border border-muted-foreground')}
      />
    </span>
  )
}

function ReplyPopover({ session }: { session: BoardSession }) {
  const Reply = useIcon('corner-down-left')
  return (
    <Popover>
      <Popover.Trigger
        render={
          <Button variant="ghost" size="icon-compact" aria-label={`Reply to ${session.title}`}>
            <Reply />
          </Button>
        }
      />
      <Popover.Content
        side="bottom"
        align="end"
        sideOffset={8}
        className="w-96 gap-[var(--space-2)] p-[var(--space-2)] pt-[var(--space-3)]"
      >
        {session.lastLine && (
          <p className="m-0 px-[var(--space-2)] text-caption text-muted-foreground">{session.lastLine}</p>
        )}
        <SizeProvider size="compact">
          <InputMessage minRows={1} maxRows={4} placeholder={`Reply to ${session.title}`} />
        </SizeProvider>
      </Popover.Content>
    </Popover>
  )
}

/** What a row can do without opening its session. */
function RowActions({ session }: { session: BoardSession }) {
  const Stop = useIcon('square')
  const Check = useIcon('check')
  if (session.status === 'waiting' && session.waitingOn?.startsWith('Permission')) {
    return (
      <>
        <Button variant="ghost" size="compact">
          Deny
        </Button>
        <Button size="compact">Allow</Button>
      </>
    )
  }
  if (session.status === 'waiting') {
    return (
      <>
        <Button variant="tertiary" size="compact">
          Answer
        </Button>
        <ReplyPopover session={session} />
      </>
    )
  }
  if (session.status === 'running') {
    return (
      <>
        <Button variant="ghost" size="icon-compact" aria-label={`Stop ${session.title}`}>
          <Stop />
        </Button>
        <ReplyPopover session={session} />
      </>
    )
  }
  return (
    <>
      {session.status === 'unread' && (
        <Button variant="ghost" size="icon-compact" aria-label={`Mark ${session.title} done`}>
          <Check />
        </Button>
      )}
      <ReplyPopover session={session} />
    </>
  )
}

/** The one line that matters for the row's state. */
function RowDetail({ session }: { session: BoardSession }) {
  if (session.status === 'waiting') return <span className="min-w-0 truncate text-foreground">{session.waitingOn}</span>
  if (session.status === 'running' && session.tasks) {
    return (
      <span className="flex min-w-0 items-center gap-2">
        <Meter
          variant="line"
          className="w-16 shrink-0"
          label="Tasks done"
          value={session.tasks.done}
          max={session.tasks.total}
          // Progress, not a budget: it never turns amber.
          warnAt={2}
          errorAt={2}
        />
        <span className="min-w-0 truncate">{session.lastLine}</span>
      </span>
    )
  }
  return <span className="min-w-0 truncate">{session.lastLine}</span>
}

function SessionRow({
  session,
  index,
  onOpen,
}: {
  session: BoardSession
  index: number
  onOpen?: (id: string) => void
}) {
  const profile = PROFILES.find(p => p.id === session.profile)
  return (
    <Table.Row index={index}>
      <Table.Cell className="w-[32%]">
        <span className="flex min-w-0 items-center gap-2">
          <StatusDot status={session.status} />
          <button
            type="button"
            onClick={() => onOpen?.(session.id)}
            className="min-w-0 cursor-pointer truncate text-left text-foreground outline-none focus-visible:ring-1 focus-visible:ring-focus-ring"
          >
            {session.title}
          </button>
        </span>
      </Table.Cell>
      <Table.Cell className="w-[16%]">
        <span className="flex min-w-0 items-center gap-1.5">
          {profile && <ProfileTile profile={profile} className="size-4" />}
          <span className="min-w-0 truncate">{session.projectLabel}</span>
        </span>
      </Table.Cell>
      <Table.Cell>
        <RowDetail session={session} />
      </Table.Cell>
      <Table.Cell className="w-12 text-right tabular-nums">{session.updated}</Table.Cell>
      <Table.Cell className="w-40">
        <span className="flex items-center justify-end gap-1">
          <RowActions session={session} />
        </span>
      </Table.Cell>
    </Table.Row>
  )
}

function ByState({ sessions, onOpen }: { sessions: BoardSession[]; onOpen?: (id: string) => void }) {
  return (
    <div className="flex flex-col gap-5">
      {COLUMNS.map(column => {
        const rows = sessions.filter(s => s.status === column.status)
        if (rows.length === 0) return null
        return (
          <section key={column.status} aria-label={column.label} className="flex min-w-0 flex-col gap-1">
            <div className="flex h-7 items-center gap-2">
              <span className="text-caption weight-medium text-foreground">{column.label}</span>
              <span className="text-caption tabular-nums text-muted-foreground">{rows.length}</span>
            </div>
            <div className="-mx-2.5 overflow-x-auto [&_table]:min-w-[640px] [&_table]:table-fixed">
              <Table size="compact">
                <Table.Body>
                  {rows.map((session, i) => (
                    <SessionRow key={session.id} session={session} index={i} onOpen={onOpen} />
                  ))}
                </Table.Body>
              </Table>
            </div>
          </section>
        )
      })}
    </div>
  )
}

function ProjectPanel({
  label,
  path,
  sessions,
  onOpen,
}: {
  label: string
  path?: string
  sessions: BoardSession[]
  onOpen?: (id: string) => void
}) {
  const shape = useShape()
  const Folder = useIcon('folder')
  const counts = COLUMNS.map(c => ({ ...c, n: sessions.filter(s => s.status === c.status).length })).filter(
    c => c.n > 0,
  )
  return (
    <section
      aria-label={label}
      className={cn('flex min-w-0 flex-col gap-2 border border-border p-[var(--space-3)]', shape.container)}
    >
      <div className="flex min-w-0 items-center gap-2">
        <Folder size={16} strokeWidth={1.5} className="shrink-0 text-muted-foreground" />
        <span className="min-w-0 truncate text-subtitle weight-semibold text-foreground">{label}</span>
        <div className="ml-auto flex shrink-0 gap-1">
          {counts.map(c => (
            <Badge
              key={c.status}
              size="compact"
              variant="dot"
              color={c.status === 'waiting' ? 'amber' : c.status === 'running' ? 'green' : 'gray'}
            >
              {c.n} {c.label.toLowerCase()}
            </Badge>
          ))}
        </div>
      </div>
      {path && <span className="truncate font-mono text-caption text-muted-foreground">{path}</span>}
      <FluidHover className="-mx-3">
        {sessions.map(session => (
          <FluidHover.Item key={session.id} onClick={() => onOpen?.(session.id)} className="gap-2">
            <StatusDot status={session.status} />
            <span className="min-w-0 flex-1 truncate text-body text-foreground">{session.title}</span>
            <span className="shrink-0 text-caption text-muted-foreground">
              {session.profile} · {session.updated}
            </span>
          </FluidHover.Item>
        ))}
      </FluidHover>
    </section>
  )
}

function ByProject({
  sessions,
  groups,
  onOpen,
}: {
  sessions: BoardSession[]
  groups: SessionGroup[]
  onOpen?: (id: string) => void
}) {
  return (
    <div className="grid items-start gap-4 @3xl:grid-cols-2 @6xl:grid-cols-3">
      {groups.map(group => (
        <ProjectPanel
          key={group.label}
          label={group.label}
          path={group.path}
          sessions={sessions.filter(s => s.projectLabel === group.label)}
          onOpen={onOpen}
        />
      ))}
    </div>
  )
}

type BoardView = 'state' | 'project'

interface SessionBoardProps {
  /** Pinned sessions; each is shown under its own project. Defaults to the mock pins. */
  pinned?: Session[]
  /** Projects and sections with their sessions. Defaults to the mock groups. */
  groups?: SessionGroup[]
  /** Controlled view. Pair with `onViewChange`. */
  view?: BoardView
  /** Initial view: by what each session needs, or by project. Defaults to `'state'`. */
  defaultView?: BoardView
  /** Called with the new view. */
  onViewChange?: (view: BoardView) => void
  /** Called with a session id when its card or row is opened. */
  onOpen?: (id: string) => void
  /** Classes for the root. */
  className?: string
}

/**
 * Every session of every project and profile on one screen, one row each,
 * and the controls to move them on without opening any.
 *
 * By state, the rows fall into what each session needs from you: needs you
 * first (a permission to allow or deny right in the row, a question to
 * answer), then running (task progress as a thin line and the latest
 * output, with stop), to review (an unread reply, marked done in one press)
 * and idle. Every row can take a reply: the arrow opens a small composer
 * under the row with the session's latest line above it. Each row names its
 * project and profile; its title opens the session. By project, each
 * project is a panel with a count per state and its sessions as rows.
 *
 * Put it inside an `@container`: the panels reflow to the width it gets.
 *
 * @example {@include ./examples.mdx}
 */
export default function SessionBoard({
  pinned = PINNED,
  groups = GROUPS,
  view,
  defaultView = 'state',
  onViewChange,
  onOpen,
  className,
}: SessionBoardProps) {
  const [current, setCurrent] = useControllableState(view, defaultView, onViewChange)
  const Kanban = useIcon('square-kanban')
  const Folder = useIcon('folder')
  const sessions = flatten(pinned, groups)
  const projects = groups.filter(g => g.kind === 'project')
  const waiting = sessions.filter(s => s.status === 'waiting').length
  const running = sessions.filter(s => s.status === 'running').length

  return (
    <div className={cn('flex min-w-0 flex-col gap-4', className)}>
      <div className="flex flex-wrap items-center gap-3">
        <p className="m-0 min-w-0 flex-1 text-body text-muted-foreground">
          {waiting} need you · {running} running · {sessions.length} sessions in {projects.length} projects
        </p>
        <SizeProvider size="compact">
          <TabsSubtle
            selectedIndex={current === 'state' ? 0 : 1}
            onSelect={i => setCurrent(i === 0 ? 'state' : 'project')}
          >
            <TabsSubtle.Item index={0} icon={Kanban} label="By state" />
            <TabsSubtle.Item index={1} icon={Folder} label="By project" />
          </TabsSubtle>
        </SizeProvider>
      </div>
      {current === 'state' ? (
        <ByState sessions={sessions} onOpen={onOpen} />
      ) : (
        <ByProject sessions={sessions} groups={projects} onOpen={onOpen} />
      )}
    </div>
  )
}

export type { BoardView, SessionBoardProps }
