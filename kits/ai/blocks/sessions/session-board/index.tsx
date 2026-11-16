/*!
 * Local addition: the AI app's sessions board — the sessions sidebar,
 * widened. The same groups in the same order (pinned, each project, the
 * user's sections, the archive folded) or the same sessions by what they
 * need from you, as one Accordion.Group: a row says what its session is
 * doing and answers or stops it in place; open it and it is a small live
 * session (the latest work and reply, the pending prompt, a reply box),
 * lifted into a card of its own. A filter narrows it to one state, project
 * or profile (the overview's sidebar picks it).
 */

'use client'

import { SurfaceProvider, useSurface } from '@justanarthur/modo-ui'
import Button from '@justanarthur/modo-ui/components/button'
import Accordion from '@justanarthur/modo-ui/components/accordion'
import Meter from '@justanarthur/modo-ui/components/meter'
import Tabs from '@justanarthur/modo-ui/components/navigation/tabs'
import Tooltip from '@justanarthur/modo-ui/components/overlays/tooltip'
import { useShape } from '@justanarthur/modo-ui/lib/shape-context'
import { useSize } from '@justanarthur/modo-ui/lib/size-context'
import { spring } from '@justanarthur/modo-ui/lib/springs'
import { SURFACE_BG, SURFACE_SHADOW } from '@justanarthur/modo-ui/lib/surface-classes'
import { useControllableState } from '@justanarthur/modo-ui/lib/use-controllable-state'
import { cn } from '@justanarthur/modo-ui/lib/utils'
import { SizeProvider } from '@justanarthur/modo-ui/primitives/sizes'
import { motion } from 'motion/react'
import { useState } from 'react'
import { useIcon } from '../../../lib/icons'
import { STATUS_GLYPH, STATUS_LABEL } from '../../../lib/status-glyph'
import type { Profile, Session, SessionGroup, SessionPrompt, SessionStatus } from '../../../lib/types'
import AgentPrompt from '../../conversation/agent-prompt'
import Composer from '../../conversation/composer'
import Transcript from '../../conversation/transcript'
import { ProfileTile } from '../../profiles/profile-switcher'

interface BoardSession extends Session {
  projectLabel: string
  /** A linked child, indented under its parent as in the sidebar. */
  child?: boolean
}

interface BoardSection {
  label: string
  sessions: BoardSession[]
  /** Folded until its heading is pressed (the archive). */
  folded?: boolean
}

type Patch = Partial<Session>

/** Which sessions the board shows: all, or one state, project or profile. */
type SessionFilter = 'all' | `state:${SessionStatus}` | `project:${string}` | `profile:${string}`

const STATES: { status: SessionStatus; label: string }[] = [
  { status: 'waiting', label: 'Needs you' },
  { status: 'running', label: 'Running' },
  { status: 'unread', label: 'To review' },
  { status: 'idle', label: 'Idle' },
]

// Each column appears once the board is wide enough to give it room.
const ROW_GRID =
  'grid min-w-0 items-center gap-3 grid-cols-[minmax(0,1fr)_auto] @xl:grid-cols-[minmax(0,1.3fr)_minmax(0,0.7fr)_auto] @3xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.6fr)_minmax(0,1.6fr)_auto]'

// Every row keeps room for the widest actions, so the chevrons and times line up.
const ACTION_SLOT = 'w-15 @lg:w-28'
const ACTION_ROOM = 'pr-19 @lg:pr-32'

function withChildren(sessions: Session[], projectLabel: (s: Session) => string): BoardSession[] {
  return sessions.flatMap(s => [
    { ...s, projectLabel: projectLabel(s) },
    ...(s.children ?? []).map(c => ({ ...c, projectLabel: projectLabel(s), child: true })),
  ])
}

/** The sidebar's order: pinned, every group, the archive folded. */
function byProject(pinned: Session[], groups: SessionGroup[], archived: Session[]): BoardSection[] {
  return [
    { label: 'Pinned', sessions: withChildren(pinned, s => s.project ?? 'Pinned') },
    ...groups.map(g => ({ label: g.label, sessions: withChildren(g.sessions, s => s.project ?? g.label) })),
    { label: 'Archived', sessions: withChildren(archived, s => s.project ?? 'Archived'), folded: true },
  ]
}

/** What each live session needs from you, most urgent first; the archive stays out. */
function byState(pinned: Session[], groups: SessionGroup[]): BoardSection[] {
  const all = byProject(pinned, groups, [])
    .flatMap(section => section.sessions)
    .map(s => ({ ...s, child: false }))
  return STATES.map(({ status, label }) => ({ label, sessions: all.filter(s => s.status === status) }))
}

function matches(session: BoardSession, filter: SessionFilter) {
  const [kind, value] = filter.split(':')
  if (kind === 'state') return session.status === value
  if (kind === 'project') return session.projectLabel === value
  if (kind === 'profile') return session.profile === value
  return true
}

function filterLabel(filter: SessionFilter) {
  const [kind, value] = filter.split(':')
  if (kind === 'state') return STATES.find(s => s.status === value)?.label ?? value
  return value
}

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

/** The one line that matters for the row's state. */
function RowDetail({ session }: { session: BoardSession }) {
  if (session.status === 'waiting') return <span className="min-w-0 truncate text-foreground">{session.waitingOn}</span>
  if (session.status === 'running' && session.tasks) {
    return (
      <span className="flex min-w-0 items-center gap-2">
        <Meter
          variant="line"
          className="w-12 shrink-0"
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

const ALLOWED: Patch = { status: 'running', prompt: undefined, waitingOn: undefined, lastLine: 'Allowed · resuming' }
const DENIED: Patch = { status: 'running', prompt: undefined, waitingOn: undefined, lastLine: 'Denied · rethinking' }

/** What a row can do without opening: allow or deny a permission, stop a run, mark a reply read. */
function RowActions({ session, onPatch }: { session: BoardSession; onPatch: (patch: Patch) => void }) {
  const Stop = useIcon('square')
  const Check = useIcon('check')
  const X = useIcon('x')

  if (session.prompt?.kind === 'permission') {
    return (
      <>
        <span className="hidden gap-1 @lg:flex">
          <Button variant="ghost" size="compact" onClick={() => onPatch(DENIED)}>
            Deny
          </Button>
          <Button size="compact" onClick={() => onPatch(ALLOWED)}>
            Allow
          </Button>
        </span>
        <span className="flex gap-1 @lg:hidden">
          <Button variant="ghost" size="icon-compact" aria-label="Deny" onClick={() => onPatch(DENIED)}>
            <X />
          </Button>
          <Button size="icon-compact" aria-label="Allow" onClick={() => onPatch(ALLOWED)}>
            <Check />
          </Button>
        </span>
      </>
    )
  }
  if (session.status === 'running') {
    return (
      <Tooltip content="Stop" side="top">
        <Button
          variant="ghost"
          size="icon-compact"
          aria-label={`Stop ${session.title}`}
          onClick={() => onPatch({ status: 'idle', lastLine: 'Stopped by you' })}
        >
          <Stop />
        </Button>
      </Tooltip>
    )
  }
  if (session.status === 'unread') {
    return (
      <Tooltip content="Mark as read" side="top">
        <Button
          variant="ghost"
          size="icon-compact"
          aria-label={`Mark ${session.title} as read`}
          onClick={() => onPatch({ status: 'idle' })}
        >
          <Check />
        </Button>
      </Tooltip>
    )
  }
  return null
}

function PendingPrompt({ prompt, onPatch }: { prompt: SessionPrompt; onPatch: (patch: Patch) => void }) {
  if (prompt.kind === 'permission') {
    return (
      <AgentPrompt.Permission
        tool={prompt.tool}
        command={prompt.command}
        rule={prompt.rule}
        onAnswer={answer => onPatch(answer === 'deny' ? DENIED : ALLOWED)}
      />
    )
  }
  return (
    <AgentPrompt.Question
      question={prompt.question}
      tag={prompt.tag}
      options={prompt.options}
      onSubmit={(labels, other) =>
        onPatch({ status: 'running', prompt: undefined, waitingOn: undefined, lastLine: other || labels.join(', ') })
      }
    />
  )
}

/** An open row: the session's latest turn, what it waits on, and a reply. */
function SessionPeek({
  session,
  onPatch,
  onOpen,
}: {
  session: BoardSession
  onPatch: (patch: Patch) => void
  onOpen?: (id: string) => void
}) {
  const Open = useIcon('arrow-up-right')
  const running = session.status === 'running'
  const tools = session.work?.tools ?? []

  return (
    <div className="flex max-w-3xl flex-col gap-3 pl-5.5 pt-1">
      {session.work && (
        <Transcript.Work summary={session.work.summary} detail={session.work.detail} running={running}>
          <Transcript.Tools>
            {tools.map((t, i) => (
              <Transcript.Tool
                key={t.summary}
                index={i}
                value={t.summary}
                tool={t.tool}
                summary={t.summary}
                meta={t.meta}
                status={running && i === tools.length - 1 ? 'running' : 'done'}
              />
            ))}
          </Transcript.Tools>
        </Transcript.Work>
      )}
      {session.reply && (
        <Transcript.Assistant streaming={running}>
          <p className="m-0">{session.reply}</p>
        </Transcript.Assistant>
      )}
      {running && session.tasks && (
        <Meter
          variant="line"
          label="Tasks"
          value={session.tasks.done}
          max={session.tasks.total}
          detail={`${session.tasks.done} of ${session.tasks.total} · ${session.lastLine}`}
          warnAt={2}
          errorAt={2}
        />
      )}
      {session.prompt && <PendingPrompt prompt={session.prompt} onPatch={onPatch} />}
      <Composer.Draft
        size="compact"
        minRows={1}
        maxRows={4}
        defaultStatus={running ? 'streaming' : 'idle'}
        placeholder={session.prompt ? 'Or tell Claude what to do instead' : `Reply to ${session.title}`}
      />
      <div className="flex min-w-0 items-center gap-2">
        <span className="min-w-0 flex-1 truncate text-caption text-muted-foreground">
          {[STATUS_LABEL[session.status], session.profile, session.branch].filter(Boolean).join(' · ')}
        </span>
        <Button variant="ghost" size="compact" trailingIcon={Open} onClick={() => onOpen?.(session.id)}>
          Open session
        </Button>
      </div>
    </div>
  )
}

function SessionItem({
  session,
  profile,
  index,
  open,
  onPatch,
  onOpen,
}: {
  session: BoardSession
  profile?: Profile
  index: number
  open: boolean
  onPatch: (id: string, patch: Patch) => void
  onOpen?: (id: string) => void
}) {
  const size = useSize()
  const shape = useShape()
  const substrate = useSurface()
  const level = Math.min(substrate + 2, 8)
  const patch = (p: Patch) => onPatch(session.id, p)

  return (
    <Accordion.Item
      value={session.id}
      index={index}
      className={cn(
        // Open, the row lifts into a card: its header the row, its body the
        // session. Margin and padding cancel out sideways, so the row holds still.
        'transition-[margin,padding,background-color,box-shadow] duration-moderate',
        open && ['-mx-1 my-3 p-1', SURFACE_BG[level], SURFACE_SHADOW[3], shape.container],
      )}
    >
      <SurfaceProvider value={open ? level : substrate}>
        <div className="relative">
          <Accordion.Trigger className={cn('[&>span:first-child]:min-w-0', ACTION_ROOM)}>
            <span className={ROW_GRID}>
              <span className={cn('flex min-w-0 items-center gap-2', session.child && 'pl-5.5')}>
                <StatusDot status={session.status} />
                <span className="min-w-0 truncate">{session.title}</span>
              </span>
              <span className="hidden min-w-0 items-center gap-1.5 weight-normal text-muted-foreground @xl:flex">
                {profile && <ProfileTile profile={profile} size="sm" />}
                <span className="min-w-0 truncate">{session.projectLabel}</span>
              </span>
              <span className="hidden min-w-0 weight-normal text-muted-foreground @3xl:flex">
                <RowDetail session={session} />
              </span>
              <span className="w-8 text-right text-caption weight-normal tabular-nums text-muted-foreground">
                {session.updated}
              </span>
            </span>
          </Accordion.Trigger>
          {/* Beside the trigger, not in it: a press here never toggles the row. */}
          <div className={cn('absolute right-1 top-0 z-20 flex items-center justify-end', size.control, ACTION_SLOT)}>
            <RowActions session={session} onPatch={patch} />
          </div>
        </div>
        <Accordion.Content>
          <SessionPeek session={session} onPatch={patch} onOpen={onOpen} />
        </Accordion.Content>
      </SurfaceProvider>
    </Accordion.Item>
  )
}

function SectionHeading({ section, open, onToggle }: { section: BoardSection; open: boolean; onToggle: () => void }) {
  const Chevron = useIcon('chevron-right')
  const label = (
    <>
      <span className="weight-medium text-foreground">{section.label}</span>
      <span className="tabular-nums">{section.sessions.length}</span>
    </>
  )
  return (
    <div className="flex h-9 items-end gap-2 px-3 pb-1.5 text-caption text-muted-foreground">
      {section.folded ? (
        <button
          type="button"
          aria-expanded={open}
          onClick={onToggle}
          className="flex cursor-pointer items-center gap-2 rounded-glyph outline-none focus-visible:ring-1 focus-visible:ring-focus-ring"
        >
          {label}
          <motion.span className="inline-flex" animate={{ rotate: open ? 90 : 0 }} transition={spring.fast}>
            <Chevron size={12} strokeWidth={1.5} />
          </motion.span>
        </button>
      ) : (
        label
      )}
    </div>
  )
}

type BoardView = 'project' | 'state'

interface SessionBoardProps {
  /** Pinned sessions, first as in the sidebar. */
  pinned: Session[]
  /** Projects and sections with their sessions, in the sidebar's order. */
  groups: SessionGroup[]
  /** Archived sessions, folded at the bottom. */
  archived: Session[]
  /** The profiles the sessions run under, for each row's tile. */
  profiles: Profile[]
  /** Controlled view. Pair with `onViewChange`. */
  view?: BoardView
  /** Initial view: the sidebar's groups, or by what each session needs. Defaults to `'project'`. */
  defaultView?: BoardView
  /** Called with the new view. */
  onViewChange?: (view: BoardView) => void
  /** Controlled filter. Pair with `onFilterChange`. */
  filter?: SessionFilter
  /** Initial filter: every session, or one state, project or profile (`'state:waiting'`, `'project:modo'`, `'profile:work'`). Defaults to `'all'`. */
  defaultFilter?: SessionFilter
  /** Called with the new filter, `'all'` when "Show all" is pressed. */
  onFilterChange?: (filter: SessionFilter) => void
  /** Controlled open rows, by session id. Pair with `onOpenChange`. */
  open?: string[]
  /** Rows open at first, by session id. Defaults to none. */
  defaultOpen?: string[]
  /** Called with the open rows. */
  onOpenChange?: (open: string[]) => void
  /** Called with a session id when its "Open session" is pressed. */
  onOpen?: (id: string) => void
  /** Called when a row answers, stops or marks its session. The board applies the change itself; pass it on to keep other views (the sidebar's counts) in step. */
  onPatch?: (id: string, patch: Partial<Session>) => void
  /** Classes for the root. */
  className?: string
}

/**
 * The sessions sidebar, widened into a control room: every session of
 * every profile, what each is doing, and the controls to move it on without
 * leaving the page.
 *
 * The rows are the sidebar's: pinned first, a group per project and per
 * section you made, the archive folded; the same run-state glyphs and
 * titles, linked children indented under their parent. Widened, a row also
 * names its profile and project, says in one line what the session waits
 * on or where its task list stands, and shows its last activity. What
 * needs no reading sits at the row's end: allow or deny a permission, stop
 * a run, mark a reply read. "By state" regroups the same rows by what each
 * needs from you: needs you, running, to review, idle.
 *
 * Press a row and it opens in place into a small live session: the latest
 * turn's work folded to one row, the latest reply, task progress while it
 * runs, the pending prompt to answer right there, a reply box and "Open
 * session". An open row lifts off the list into a card (one surface step up,
 * with its shadow and a gap above and below), the row its header and the
 * session its body, so several open at once stay separate units while the
 * closed rows stay a dense list; one hover highlight runs down the whole
 * board. Answer a prompt and the row goes back to running.
 *
 * `filter` narrows the board to one state (`'state:waiting'`), project
 * (`'project:modo'`) or profile (`'profile:work'`); the summary line then
 * names it, counts what it shows and offers "Show all". `onPatch` reports
 * every answer, stop or mark-read, so a view beside the board (the overview's
 * sidebar counts) can follow.
 *
 * Put it inside an `@container`: columns and labels fold away as it narrows.
 *
 * @example {@include ./examples.mdx}
 */
export default function SessionBoard({
  pinned,
  groups,
  archived,
  profiles,
  view,
  defaultView = 'project',
  onViewChange,
  filter,
  defaultFilter = 'all',
  onFilterChange,
  open,
  defaultOpen = [],
  onOpenChange,
  onOpen,
  onPatch,
  className,
}: SessionBoardProps) {
  const [current, setCurrent] = useControllableState(view, defaultView, onViewChange)
  const [shown, setShown] = useControllableState(filter, defaultFilter, onFilterChange)
  const [openRows, setOpenRows] = useControllableState(open, defaultOpen, onOpenChange)
  const [patches, setPatches] = useState<Record<string, Patch>>({})
  const [archiveOpen, setArchiveOpen] = useState(false)
  const Folder = useIcon('folder')
  const Kanban = useIcon('square-kanban')

  const live = (s: BoardSession): BoardSession => ({ ...s, ...patches[s.id] })
  const sections = (current === 'project' ? byProject(pinned, groups, archived) : byState(pinned, groups))
    .map(section => ({
      ...section,
      sessions: section.sessions
        .map(live)
        .filter(s => matches(s, shown))
        // Filtered, a child may show without its parent: no indent to hang from.
        .map(s => ({ ...s, child: s.child && shown === 'all' })),
    }))
    .filter(section => section.sessions.length > 0)
  const all = byState(pinned, groups).flatMap(section => section.sessions.map(live))
  const waiting = all.filter(s => s.status === 'waiting').length
  const running = all.filter(s => s.status === 'running').length
  const count = sections.reduce((n, section) => n + section.sessions.length, 0)
  const patch = (id: string, p: Patch) => {
    setPatches(prev => ({ ...prev, [id]: { ...prev[id], ...p } }))
    onPatch?.(id, p)
  }

  let index = 0

  return (
    <div className={cn('@container flex min-w-0 flex-col gap-2', className)}>
      <div className="flex flex-wrap items-center gap-3 px-3">
        {shown === 'all' ? (
          <p className="m-0 min-w-0 flex-1 text-body text-muted-foreground">
            {waiting} need you · {running} running · {all.length} sessions
          </p>
        ) : (
          <p className="m-0 flex min-w-0 flex-1 items-center gap-2 text-body text-muted-foreground">
            <span className="min-w-0 truncate">
              <span className="weight-medium text-foreground">{filterLabel(shown)}</span> · {count} of {all.length}{' '}
              sessions
            </span>
            <Button variant="ghost" size="compact" onClick={() => setShown('all')}>
              Show all
            </Button>
          </p>
        )}
        <SizeProvider size="compact">
          <Tabs variant="subtle" value={current} onValueChange={value => setCurrent(value as BoardView)}>
            <Tabs.List aria-label="Group sessions">
              <Tabs.Item value="project" icon={Folder} label="By project" />
              <Tabs.Item value="state" icon={Kanban} label="By state" />
            </Tabs.List>
          </Tabs>
        </SizeProvider>
      </div>
      <Accordion.Group
        type="multiple"
        value={openRows}
        onValueChange={setOpenRows}
        highlight="trigger"
        className="w-full max-w-none"
      >
        {sections.map(section => {
          const unfolded = !section.folded || archiveOpen
          return (
            <section key={section.label} aria-label={section.label} className="flex flex-col">
              <SectionHeading section={section} open={unfolded} onToggle={() => setArchiveOpen(!archiveOpen)} />
              {unfolded &&
                section.sessions.map(session => (
                  <SessionItem
                    key={session.id}
                    session={session}
                    profile={profiles.find(p => p.id === session.profile)}
                    index={index++}
                    open={openRows.includes(session.id)}
                    onPatch={patch}
                    onOpen={onOpen}
                  />
                ))}
            </section>
          )
        })}
      </Accordion.Group>
    </div>
  )
}

export type { BoardView, SessionBoardProps, SessionFilter }

export { SessionBoard }
