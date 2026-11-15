/*!
 * Local addition: the agent desktop's sessions board — every session of
 * every project and profile at once, laid out by what it needs from you
 * (needs you, running, to review, idle) or by project. Cards are an outlined
 * Card.Group per column (one fluid hover each); the view switch is
 * TabsSubtle; running sessions show their task progress as a Meter.
 */

'use client'

import Badge from '../../../components/badge'
import Card from '../../../components/card'
import Meter from '../../../components/meter'
import TabsSubtle from '../../../components/navigation/tabs-subtle'
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

function SessionCard({
  session,
  index,
  onOpen,
}: {
  session: BoardSession
  index: number
  onOpen?: (id: string) => void
}) {
  const profile = PROFILES.find(p => p.id === session.profile)
  const Folder = useIcon('folder')
  const linked = session.children?.length ?? 0
  return (
    <Card index={index} onClick={() => onOpen?.(session.id)} label={session.title}>
      <div className="flex min-w-0 flex-col gap-2 px-4 pt-3">
        <div className="flex min-w-0 items-center gap-1.5 text-caption text-muted-foreground">
          {profile && <ProfileTile profile={profile} className="size-4" />}
          <Folder size={12} strokeWidth={1.5} className="shrink-0" />
          <span className="min-w-0 truncate">{session.projectLabel}</span>
          <span className="ml-auto shrink-0 tabular-nums">{session.updated}</span>
        </div>
        <span className="text-body weight-medium text-foreground">{session.title}</span>
        {session.status === 'waiting' && session.waitingOn && (
          <span className="flex min-w-0 items-start gap-1.5 text-caption text-foreground">
            <StatusDot status="waiting" />
            <span className="min-w-0">{session.waitingOn}</span>
          </span>
        )}
        {session.status === 'running' && session.tasks && (
          <SizeProvider size="compact">
            <Meter
              label={session.lastLine ?? 'Working'}
              value={session.tasks.done}
              max={session.tasks.total}
              detail={`${session.tasks.done} of ${session.tasks.total}`}
              // Progress, not a budget: it never turns amber.
              warnAt={2}
              errorAt={2}
            />
          </SizeProvider>
        )}
        {session.status !== 'waiting' && session.status !== 'running' && session.lastLine && (
          <span className="truncate text-caption text-muted-foreground">{session.lastLine}</span>
        )}
        {(session.branch || linked > 0) && (
          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            {session.branch && (
              <span className="min-w-0 truncate font-mono text-caption text-muted-foreground">{session.branch}</span>
            )}
            {linked > 0 && (
              <Badge size="compact" color="gray">
                {linked} linked
              </Badge>
            )}
          </div>
        )}
      </div>
    </Card>
  )
}

function ByState({ sessions, onOpen }: { sessions: BoardSession[]; onOpen?: (id: string) => void }) {
  return (
    <div className="grid items-start gap-4 @xl:grid-cols-2 @4xl:grid-cols-4">
      {COLUMNS.map(column => {
        const cards = sessions.filter(s => s.status === column.status)
        return (
          <section key={column.status} aria-label={column.label} className="flex min-w-0 flex-col gap-2">
            <div className="flex h-7 items-center gap-2 px-1">
              <StatusDot status={column.status} />
              <span className="text-body weight-medium text-foreground">{column.label}</span>
              <span className="text-caption tabular-nums text-muted-foreground">{cards.length}</span>
            </div>
            {cards.length > 0 ? (
              <Card.Group border="outlined" separated className="w-full">
                {cards.map((session, i) => (
                  <SessionCard key={session.id} session={session} index={i} onOpen={onOpen} />
                ))}
              </Card.Group>
            ) : (
              <p className="m-0 px-1 text-caption text-muted-foreground">Nothing here</p>
            )}
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
    <section aria-label={label} className={cn('flex min-w-0 flex-col gap-2 border border-border p-3', shape.container)}>
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
      <FluidHover className="-mx-2">
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
 * Every session of every project and profile on one screen, sorted by what
 * it needs from you.
 *
 * By state, the board has four columns: needs you (a permission, a
 * question or a plan waits, and the card says which), running (with its
 * task progress and the latest line), to review (an unread reply) and
 * idle. Each card names its project, profile, last activity, branch and
 * linked sessions; one hover highlight runs down each column. By project,
 * each project is a panel with its sessions as rows and a count per state,
 * so a busy project stands out. Open a card or row to go to the session.
 *
 * Put it inside an `@container`: the columns reflow to the width it gets.
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
