/*!
 * Local addition: the AI app's sessions sidebar, composed on Sidebar
 * the way the SidebarApp block is: the profile switcher, a "New session" row
 * and search in the header; pinned sessions, project groups and the user's
 * own sections, an archive; and a settings row in the footer. A session row
 * shows its run state (running, needs input, unread, idle), its last activity
 * and, on hover, pin, archive and a row menu with "Open in split view".
 * Linked child sessions fold under their parent. On the overview the list
 * gives way to filters for its board (state, project, profile).
 */

'use client'

import { SidebarSearchField } from '@justanarthur/modo-ui/blocks/sidebar-app'
import Kbd from '@justanarthur/modo-ui/components/data-display/kbd'
import Sidebar from '@justanarthur/modo-ui/components/navigation/sidebar'
import {
  DropdownContent,
  DropdownMenu,
  DropdownTrigger,
  MenuItem,
} from '@justanarthur/modo-ui/components/overlays/dropdown'
import Tooltip, { TooltipProvider } from '@justanarthur/modo-ui/components/overlays/tooltip'
import { useControllableState } from '@justanarthur/modo-ui/lib/use-controllable-state'
import Sortable, { useSortableHandle } from '@justanarthur/modo-ui/primitives/layout/sortable'
import {
  memo,
  type ReactElement,
  type SyntheticEvent,
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { type IconComponent, useIcon } from '../../../lib/icons'
import { groupKey } from '../../../lib/session-group'
import { STATUS_GLYPH, STATUS_LABEL } from '../../../lib/status-glyph'
import type { Profile, Session, SessionGroup, SessionStatus } from '../../../lib/types'
import { ProfileTile } from '../../profiles/profile-switcher'
import ProfileUsage from '../../profiles/profile-usage'
import Inbox, { type InboxAction, type InboxItem } from '../inbox'
import type { SessionFilter } from '../session-board'

const STATES: { status: SessionStatus; label: string }[] = [
  { status: 'waiting', label: 'Needs you' },
  { status: 'failed', label: 'Failed' },
  { status: 'running', label: 'Running' },
  { status: 'unread', label: 'To review' },
  { status: 'idle', label: 'Idle' },
]

/** Every live session, children included, with the project it belongs to. */
function everySession(pinned: Session[], groups: SessionGroup[]) {
  const withChildren = (s: Session, project?: string) =>
    [s, ...(s.children ?? [])].map(c => ({ ...c, project: s.project ?? project }))
  return [
    ...pinned.flatMap(s => withChildren(s)),
    ...groups.flatMap(g => g.sessions.flatMap(s => withChildren(s, g.label))),
  ]
}

/** A pinned row's grip: drag it, or focus it and press Space, to move the row among the pinned. */
function ReorderAction() {
  const Grip = useIcon('grip-vertical')
  const handle = useSortableHandle()
  return (
    <Sidebar.MenuAction {...handle} className="cursor-grab touch-none active:cursor-grabbing">
      <Grip />
    </Sidebar.MenuAction>
  )
}

const ACTIONS = [
  'onOpenSplit',
  'onPin',
  'onArchive',
  'onRename',
  'onMarkUnread',
  'onFork',
  'onNewSessionIn',
  'onFilterSection',
] as const

/** What a row's hover actions and menu, and a group's action, call. An action whose callback is absent is left out. */
type RowActions = Pick<SessionSidebarProps, (typeof ACTIONS)[number]>

/**
 * Stand-ins for the row and group callbacks that keep their identity while
 * the same ones are passed, so memoized rows and groups skip the sidebar's
 * re-renders; each calls the latest callback.
 */
function useRowActions(actions: RowActions): RowActions {
  const latest = useRef(actions)
  useLayoutEffect(() => {
    latest.current = actions
  })
  const present = ACTIONS.filter(key => actions[key]).join()
  return useMemo(() => {
    const call =
      (key: keyof RowActions) =>
      (...args: unknown[]) =>
        (latest.current[key] as ((...args: unknown[]) => void) | undefined)?.(...args)
    return Object.fromEntries(present.split(',').flatMap(key => (key ? [[key, call(key as keyof RowActions)]] : [])))
  }, [present])
}

/** What a row shows: a fresh but equal session (an app rebuilds its list each render) doesn't re-render it. */
const sameRowData = (a: Session, b: Session) => a.updated === b.updated && sameRowShape(a, b)

interface SessionRowProps {
  session: Session
  /** Inside the pinned Sortable: the actions lead with a grip. */
  reorder?: boolean
  /** Inside the archive: Archive becomes Unarchive. */
  archived?: boolean
  actions: RowActions
}

/** A row action's tooltip, mounted once its row is first hovered or focused. */
function ActionTip({ armed, label, children }: { armed: boolean; label: string; children: ReactElement }) {
  return armed ? (
    <Tooltip content={label} side="top">
      {children}
    </Tooltip>
  ) : (
    children
  )
}

/** A row's menu, mounted once its row is first hovered or focused. */
function RowMenu({
  session,
  reorder,
  archived,
  actions,
}: Required<Omit<SessionRowProps, 'actions'>> & { actions: RowActions }) {
  const { onOpenSplit, onArchive, onRename, onMarkUnread, onFork } = actions
  const More = useIcon('more-vertical')
  const Archive = useIcon('archive')
  const Pencil = useIcon('pencil')
  const Columns = useIcon('columns-2')
  const Dot = useIcon('circle-dot')
  const Branch = useIcon('git-branch')
  const archiveLabel = archived ? 'Unarchive' : 'Archive'

  return (
    <DropdownMenu>
      <DropdownTrigger
        render={
          <Sidebar.MenuAction aria-label="More options" data-row-action="more">
            <More />
          </Sidebar.MenuAction>
        }
      />
      <DropdownContent className="w-[240px] min-w-0" align="start" sideOffset={4}>
        {onOpenSplit && <MenuItem icon={Columns} label="Open in split view" onSelect={() => onOpenSplit(session.id)} />}
        {onRename && <MenuItem icon={Pencil} label="Rename" onSelect={() => onRename(session.id)} />}
        {onMarkUnread && session.status !== 'unread' && (
          <MenuItem icon={Dot} label="Mark as unread" onSelect={() => onMarkUnread(session.id)} />
        )}
        {onFork && <MenuItem icon={Branch} label="Fork into a new session" onSelect={() => onFork(session.id)} />}
        {reorder && onArchive && (
          <MenuItem icon={Archive} label={archiveLabel} onSelect={() => onArchive(session.id, !archived)} />
        )}
      </DropdownContent>
    </DropdownMenu>
  )
}

/** What a row's button, actions and children show: everything but the last activity. */
function sameRowShape(a: Session, b: Session) {
  const kids = (s: Session) => (s.children ?? []).map(c => `${c.id}\n${c.title}\n${c.status}`).join('\n\n')
  return (
    a === b ||
    (a.id === b.id &&
      a.title === b.title &&
      a.status === b.status &&
      a.profile === b.profile &&
      a.pinned === b.pinned &&
      kids(a) === kids(b))
  )
}

type RowPartProps = Required<Omit<SessionRowProps, 'actions'>> & { actions: RowActions; armed: boolean }

const samePart = (a: RowPartProps, b: RowPartProps) =>
  a.reorder === b.reorder &&
  a.archived === b.archived &&
  a.actions === b.actions &&
  a.armed === b.armed &&
  sameRowShape(a.session, b.session)

/** The row's button: apart from its badge, so the minute ticking over re-renders the badge alone. */
const RowButton = memo(
  function RowButton({ session }: Pick<RowPartProps, 'session'>) {
    const glyph = STATUS_GLYPH[session.status]
    return (
      <Sidebar.MenuButton
        value={session.id}
        icon={glyph}
        status={glyph ? undefined : session.status === 'unread' ? 'unread' : 'idle'}
        title={`${session.title} · ${STATUS_LABEL[session.status]} · ${session.profile}`}
      >
        <span className="truncate">{session.title}</span>
      </Sidebar.MenuButton>
    )
  },
  (a, b) => sameRowShape(a.session, b.session),
)

/** The row's hover actions and its linked children. */
const RowRest = memo(function RowRest({ session, reorder, archived, actions, armed }: RowPartProps) {
  const { onOpenSplit, onPin, onArchive, onRename, onMarkUnread, onFork } = actions
  const Pin = useIcon('pin')
  const Archive = useIcon('archive')
  const More = useIcon('more-vertical')
  const Branch = useIcon('git-branch')
  const children = session.children ?? []
  const pinLabel = session.pinned ? 'Unpin' : 'Pin'
  const archiveLabel = archived ? 'Unarchive' : 'Archive'
  const hasMenu = Boolean(
    onOpenSplit || onRename || (onMarkUnread && session.status !== 'unread') || onFork || (reorder && onArchive),
  )

  // Filtered: the cluster sizes the row's gutter by its child count, nulls included. A pinned row trades Archive (in its menu) for the grip.
  const cluster = [
    reorder && <ReorderAction key="reorder" />,
    onPin && (
      <ActionTip key="pin" armed={armed} label={pinLabel}>
        <Sidebar.MenuAction
          aria-label={pinLabel}
          data-row-action="pin"
          onClick={() => onPin(session.id, !session.pinned)}
        >
          <Pin />
        </Sidebar.MenuAction>
      </ActionTip>
    ),
    !reorder && onArchive && (
      <ActionTip key="archive" armed={armed} label={archiveLabel}>
        <Sidebar.MenuAction
          aria-label={archiveLabel}
          data-row-action="archive"
          onClick={() => onArchive(session.id, !archived)}
        >
          <Archive />
        </Sidebar.MenuAction>
      </ActionTip>
    ),
    hasMenu &&
      (armed ? (
        <RowMenu key="more" session={session} reorder={reorder} archived={archived} actions={actions} />
      ) : (
        <Sidebar.MenuAction key="more" aria-label="More options" aria-haspopup="menu" data-row-action="more">
          <More />
        </Sidebar.MenuAction>
      )),
  ].filter(Boolean)

  return (
    <>
      {cluster.length > 0 && <Sidebar.MenuActions showOnHover>{cluster}</Sidebar.MenuActions>}
      {children.length > 0 && (
        <Sidebar.MenuSub>
          {children.map(child => (
            <Sidebar.MenuSubItem key={child.id}>
              <Sidebar.MenuSubButton value={child.id} icon={STATUS_GLYPH[child.status] ?? Branch}>
                {child.title}
              </Sidebar.MenuSubButton>
            </Sidebar.MenuSubItem>
          ))}
        </Sidebar.MenuSub>
      )}
    </>
  )
}, samePart)

const SessionRow = memo(
  function SessionRow({ session, reorder = false, archived = false, actions }: SessionRowProps) {
    // Tooltips and the menu cost a dozen components a row: they mount on the row's first hover or focus.
    const [armed, setArmed] = useState(false)
    const refocus = useRef<string | undefined>(undefined)
    const row = useRef<HTMLLIElement>(null)
    const nested = (session.children?.length ?? 0) > 0

    // Arming swaps an action for its tooltip-wrapped twin: give focus back to the one that had it.
    useLayoutEffect(() => {
      if (!armed || !refocus.current) return
      row.current?.querySelector<HTMLElement>(`[data-row-action="${refocus.current}"]`)?.focus()
      refocus.current = undefined
    }, [armed])

    const arm = (e: SyntheticEvent) => {
      if (e.type === 'focus') refocus.current = (e.target as HTMLElement).dataset.rowAction
      setArmed(true)
    }

    return (
      <Sidebar.MenuItem
        ref={row}
        collapsible={nested ? true : undefined}
        defaultOpen={nested ? true : undefined}
        onPointerEnter={armed ? undefined : arm}
        onFocus={armed ? undefined : arm}
      >
        <RowButton session={session} />
        <Sidebar.MenuBadge>{session.updated}</Sidebar.MenuBadge>
        <RowRest session={session} reorder={reorder} archived={archived} actions={actions} armed={armed} />
      </Sidebar.MenuItem>
    )
  },
  (a, b) =>
    a.reorder === b.reorder &&
    a.archived === b.archived &&
    a.actions === b.actions &&
    a.session.updated === b.session.updated &&
    sameRowShape(a.session, b.session),
)

/**
 * The pinned rows' order: `pinned`'s own, or the order just dragged into
 * until the app hands back a different `pinned`, so a drag shows at once
 * and a row pinned later joins the list.
 */
function usePinnedOrder(pinned: Session[], onChange?: (ids: string[]) => void) {
  const ids = pinned.map(s => s.id)
  const key = ids.join('\n')
  const [dragged, setDragged] = useState<{ key: string; order: string[] }>()
  const order = dragged?.key === key ? dragged.order : ids
  const reorder = (next: string[]) => {
    setDragged({ key, order: next })
    onChange?.(next)
  }
  return [order, reorder] as const
}

/** Sessions that need you: they stay in view past a group's `groupLimit` unless `keepVisible` says otherwise. */
const needsAttention = (session: Session) =>
  session.status === 'running' ||
  session.status === 'waiting' ||
  session.status === 'failed' ||
  session.status === 'unread'

/** A group's first `limit` sessions, plus those past them in `keep`, in the group's order. */
function capped(sessions: Session[], limit: number | undefined, keep: string[]) {
  if (limit === undefined || sessions.length <= limit) return sessions
  return sessions.filter((s, i) => i < limit || keep.includes(s.id))
}

interface GroupSectionProps {
  group: SessionGroup
  actions: RowActions
  /** The rows listed before Show more; `undefined` lists all. */
  limit: number | undefined
  /** The group is longer than the sidebar's `groupLimit`: it gets the Show more / Show fewer row. */
  capped: boolean
  /** The ids of the group's sessions that show past the limit (the selected one, those `keepVisible` keeps), one per line: a string, so the memo compares it by value. */
  keep: string
  onToggle: (key: string) => void
}

/** A project folder or section, memoized like its rows: a change in one group re-renders only that group. */
const GroupSection = memo(
  function GroupSection({ group, actions, limit, capped: long, keep, onToggle }: GroupSectionProps) {
    const Plus = useIcon('plus')
    const Filter = useIcon('sliders-horizontal')
    const MoreRows = useIcon('more-horizontal')
    const isProject = group.kind === 'project'
    const onAction = isProject ? actions.onNewSessionIn : actions.onFilterSection
    const label = isProject ? `New session in ${group.label}` : 'Filter'
    const shown = capped(group.sessions, limit, keep.split('\n'))
    const hidden = group.sessions.length - shown.length

    return (
      <Sidebar.Group collapsible>
        <Sidebar.GroupLabel>{group.label}</Sidebar.GroupLabel>
        {onAction && (
          <Sidebar.GroupActions>
            <Tooltip content={label} side="top">
              <Sidebar.GroupAction aria-label={label} onClick={() => onAction(group)}>
                {isProject ? <Plus /> : <Filter />}
              </Sidebar.GroupAction>
            </Tooltip>
          </Sidebar.GroupActions>
        )}
        <Sidebar.Menu>
          {shown.map(session => (
            <SessionRow key={session.id} session={session} actions={actions} />
          ))}
          {long && (limit === undefined || hidden > 0) && (
            <Sidebar.MenuItem>
              <Sidebar.MenuButton
                icon={MoreRows}
                aria-expanded={limit === undefined}
                className="text-muted-foreground"
                onClick={() => onToggle(groupKey(group))}
              >
                {limit === undefined ? 'Show fewer' : `Show ${hidden} more`}
              </Sidebar.MenuButton>
            </Sidebar.MenuItem>
          )}
        </Sidebar.Menu>
      </Sidebar.Group>
    )
  },
  (a, b) =>
    a.actions === b.actions &&
    a.limit === b.limit &&
    a.capped === b.capped &&
    a.keep === b.keep &&
    a.onToggle === b.onToggle &&
    a.group.label === b.group.label &&
    a.group.kind === b.group.kind &&
    a.group.path === b.group.path &&
    a.group.sessions.length === b.group.sessions.length &&
    a.group.sessions.every((s, i) => sameRowData(s, b.group.sessions[i]!)),
)

/** The overview's job for the list: narrow the board to one state, project or profile, with counts. */
function SessionFilters({
  pinned,
  groups,
  profiles,
}: {
  pinned: Session[]
  groups: SessionGroup[]
  profiles: Profile[]
}) {
  const Folder = useIcon('folder')
  const all = everySession(pinned, groups)
  const count = (match: (s: Session) => boolean) => all.filter(match).length
  // A filter matches a project by its label: folders of one name share a row.
  const projects = [...new Set(groups.filter(g => g.kind === 'project').map(g => g.label))]
  const used = profiles.filter(p => all.some(s => s.profile === p.id))
  // Built once per profile list: a component made during render would remount its row's icon every time.
  const icons = useMemo(
    () =>
      Object.fromEntries(
        profiles.map(profile => [profile.id, (() => <ProfileTile profile={profile} size="sm" />) as IconComponent]),
      ),
    [profiles],
  )

  return (
    <>
      <Sidebar.Group>
        <Sidebar.GroupLabel>State</Sidebar.GroupLabel>
        <Sidebar.Menu>
          {STATES.map(({ status, label }) => (
            <Sidebar.MenuItem key={status}>
              <Sidebar.MenuButton
                value={`state:${status}` satisfies SessionFilter}
                icon={STATUS_GLYPH[status]}
                status={STATUS_GLYPH[status] ? undefined : status === 'unread' ? 'unread' : 'idle'}
              >
                {label}
              </Sidebar.MenuButton>
              <Sidebar.MenuBadge>{count(s => s.status === status)}</Sidebar.MenuBadge>
            </Sidebar.MenuItem>
          ))}
        </Sidebar.Menu>
      </Sidebar.Group>

      <Sidebar.Group>
        <Sidebar.GroupLabel>Projects</Sidebar.GroupLabel>
        <Sidebar.Menu>
          {projects.map(label => (
            <Sidebar.MenuItem key={label}>
              <Sidebar.MenuButton value={`project:${label}` satisfies SessionFilter} icon={Folder}>
                {label}
              </Sidebar.MenuButton>
              <Sidebar.MenuBadge>{count(s => s.project === label)}</Sidebar.MenuBadge>
            </Sidebar.MenuItem>
          ))}
        </Sidebar.Menu>
      </Sidebar.Group>

      <Sidebar.Group>
        <Sidebar.GroupLabel>Profiles</Sidebar.GroupLabel>
        <Sidebar.Menu>
          {used.map(profile => (
            <Sidebar.MenuItem key={profile.id}>
              <Sidebar.MenuButton value={`profile:${profile.id}` satisfies SessionFilter} icon={icons[profile.id]}>
                {profile.name}
              </Sidebar.MenuButton>
              <Sidebar.MenuBadge>{count(s => s.profile === profile.id)}</Sidebar.MenuBadge>
            </Sidebar.MenuItem>
          ))}
        </Sidebar.Menu>
      </Sidebar.Group>
    </>
  )
}

interface SessionSidebarProps {
  /** Pinned sessions, above every group, in their order. A drag shows its new order at once and hands it to `onPinnedOrderChange`; the next `pinned` wins. */
  pinned: Session[]
  /** Called with the pinned sessions' ids after one is dragged to a new place. */
  onPinnedOrderChange?: (ids: string[]) => void
  /** Project folders and the user's own sections, in order. */
  groups: SessionGroup[]
  /** The most rows a group lists before a "Show N more" row unfolds the rest; the selected session and those `keepVisible` keeps show past it. Omit to list every row. */
  groupLimit?: number
  /** Whether a session past `groupLimit` stays in view, in its place among the rows. Defaults to the sessions that need you: running, waiting or unread. Pass `() => false` to keep only the selected one. */
  keepVisible?: (session: Session) => boolean
  /** Archived sessions, folded at the bottom. */
  archived: Session[]
  /** The profiles the sessions run under, for the footer's usage and the profile filters. */
  profiles: Profile[]
  /** What the content lists: the sessions, or (on the overview, whose board is that list widened) filters for the board by state, project and profile, with counts. Defaults to `'sessions'`. */
  list?: 'sessions' | 'filters'
  /** Controlled selected session id. Pair with `onValueChange`. */
  value?: string
  /** Initial selected session id, for an uncontrolled sidebar. */
  defaultValue?: string
  /** Called with the session id when a row is picked; the header's Overview row picks `'overview'` and its New session row `'new'`. */
  onValueChange?: (value: string) => void
  /** Called when a row's menu asks to open its session in split view. Omit to leave the menu item out. */
  onOpenSplit?: (id: string) => void
  /** Called by a row's pin action with the session id and whether it should now be pinned. Omit to leave the action out. */
  onPin?: (id: string, pinned: boolean) => void
  /** Called by a row's archive action (in a pinned row's menu, Unarchive in the archive) with the session id and whether it should now be archived. Omit to leave the action out. */
  onArchive?: (id: string, archived: boolean) => void
  /** Called by a row's Rename menu item with the session id: open your rename field (the title bar's, say). Omit to leave the item out. */
  onRename?: (id: string) => void
  /** Called by a row's Mark as unread menu item, shown on rows not already unread. Omit to leave the item out. */
  onMarkUnread?: (id: string) => void
  /** Called by a row's Fork into a new session menu item with the session id. Omit to leave the item out. */
  onFork?: (id: string) => void
  /** Called by a project group's New session action with that group. Omit to leave the action out. */
  onNewSessionIn?: (group: SessionGroup) => void
  /** Called by a section's Filter action with that section. Omit to leave the action out. */
  onFilterSection?: (group: SessionGroup) => void
  /** What needs you across sessions: a header row opens them, with the unread count. Omit for no inbox row. */
  inbox?: InboxItem[]
  /** Called when an inbox row is answered or opened. */
  onInboxAction?: (item: InboxItem, action: InboxAction) => void
  /** Called when the search field is clicked or Enter is pressed in it: open your ⌘K palette. Omit to keep it a plain field. */
  onSearch?: () => void
  /** Called by the footer's Settings row and the usage's manage action. Omit to leave the Settings row out. */
  onOpenSettings?: () => void
  /** The sidebar's layout (see Sidebar). Defaults to `'inset'`. */
  variant?: 'sidebar' | 'floating' | 'inset'
  /** Classes for the sidebar. */
  className?: string
}

/**
 * The AI app's sessions rail: every session of every profile,
 * grouped by project, with what each one is doing right now.
 *
 * Sessions of every profile sit side by side, so there is no profile to
 * switch: the header opens the overview of every session (see the session
 * board), starts a new session and searches, and the footer shows how much
 * each profile has left (see the profile usage). Below it come the pinned sessions, which you
 * reorder by a row's grip (drag it, or focus it, press Space and use the
 * arrows), then one group
 * per project folder and per section you made, then the archive, folded.
 * Pinned and the archive show once they hold a session, and Overview counts
 * the sessions that need you only when there are some.
 * `groupLimit` caps a long group: past it a "Show N more" row unfolds the
 * rest. The selected session and the ones that need you (running, waiting,
 * unread; `keepVisible` decides) stay in view past the cap, in their place.
 * Groups are told apart by `path`, so two project folders of one name are
 * two groups.
 * A row's leading glyph is its state: an arc turning while it runs, an
 * amber dot while it waits for you, a filled dot for an unread reply and a
 * ring when idle; its badge is the last activity. Hover a row for pin,
 * archive and a menu that opens the session in split view, renames it,
 * marks it unread or forks it. Each of those actions, a group's New session
 * or Filter action and the footer's Settings row shows only when you pass
 * its callback (`onPin`, `onArchive`, `onOpenSplit`, `onRename`,
 * `onMarkUnread`, `onFork`, `onNewSessionIn`, `onFilterSection`,
 * `onOpenSettings`), so the sidebar offers only what your app does. The
 * Overview and New session rows are picks like a session's: `onValueChange`
 * gets `'overview'` or `'new'`. Sessions started from another one fold
 * under it as linked children. Pick a row and the active background melts over to it.
 *
 * On the overview, whose board is the session list widened, `list="filters"`
 * trades the list for filters: by state, project and profile, each with its
 * count; a row's `value` (`'state:waiting'`, `'project:modo'`,
 * `'profile:work'`) is the board's `filter`.
 *
 * Put it inside a `Sidebar.Provider`, next to the `Sidebar.Inset` that holds
 * the session.
 *
 * Built for hundreds of sessions: an app may rebuild its session objects on
 * every render, and only rows whose shown data changed (title, state, last
 * activity, pin, children) re-render; the row callbacks may be fresh
 * closures too. A row's tooltips and menu mount on its first hover or
 * focus.
 *
 * @example {@include ./examples.mdx}
 */
export default function SessionSidebar({
  pinned,
  groups,
  groupLimit,
  keepVisible = needsAttention,
  archived,
  profiles,
  onPinnedOrderChange,
  list = 'sessions',
  value,
  defaultValue,
  onValueChange,
  onOpenSplit,
  onPin,
  onArchive,
  onRename,
  onMarkUnread,
  onFork,
  onNewSessionIn,
  onFilterSection,
  onOpenSettings,
  inbox,
  onInboxAction,
  onSearch,
  variant = 'inset',
  className,
}: SessionSidebarProps) {
  const Plus = useIcon('plus')
  const Board = useIcon('layout-dashboard')
  const Settings = useIcon('settings')
  const Bell = useIcon('bell')
  const unread = inbox?.filter(item => !item.read).length ?? 0
  const waiting = everySession(pinned, groups).filter(s => s.status === 'waiting').length
  const actions = useRowActions({
    onOpenSplit,
    onPin,
    onArchive,
    onRename,
    onMarkUnread,
    onFork,
    onNewSessionIn,
    onFilterSection,
  })
  const [selected, select] = useControllableState(value, defaultValue ?? '', onValueChange)
  const [expanded, setExpanded] = useState<string[]>([])
  const toggleGroup = useCallback(
    (key: string) => setExpanded(open => (open.includes(key) ? open.filter(k => k !== key) : [...open, key])),
    [],
  )
  const [pinnedOrder, reorderPinned] = usePinnedOrder(pinned, onPinnedOrderChange)

  // One delay group for every row's tooltips, instead of a provider per tooltip.
  return (
    <TooltipProvider>
      <Sidebar variant={variant} className={className} value={selected} onValueChange={select}>
        <Sidebar.Header>
          <div className="flex flex-col gap-0.5">
            <Sidebar.Menu>
              <Sidebar.MenuItem>
                <Sidebar.MenuButton icon={Board} value="overview">
                  Overview
                  {waiting > 0 && (
                    <span className="ml-auto text-micro tabular-nums text-muted-foreground">{waiting} need you</span>
                  )}
                </Sidebar.MenuButton>
              </Sidebar.MenuItem>
              {inbox && (
                <Sidebar.MenuItem>
                  <Inbox
                    items={inbox}
                    onAction={onInboxAction}
                    side="right"
                    align="start"
                    trigger={
                      <Sidebar.MenuButton icon={Bell} aria-label={unread > 0 ? `Inbox, ${unread} unread` : 'Inbox'}>
                        Inbox
                      </Sidebar.MenuButton>
                    }
                  />
                  {unread > 0 && <Sidebar.MenuBadge>{unread}</Sidebar.MenuBadge>}
                </Sidebar.MenuItem>
              )}
              <Sidebar.MenuItem>
                <Sidebar.MenuButton icon={Plus} value="new">
                  New session
                  <Kbd variant="plain" className="ml-auto">
                    ⌘N
                  </Kbd>
                </Sidebar.MenuButton>
              </Sidebar.MenuItem>
            </Sidebar.Menu>
            <SidebarSearchField
              placeholder="Search sessions"
              {...(onSearch && {
                readOnly: true,
                onClick: onSearch,
                onKeyDown: e => {
                  if (e.key === 'Enter') onSearch()
                },
              })}
            />
          </div>
        </Sidebar.Header>

        {/* No hairline at the scroll edges: the fade alone says the list goes on. */}
        <Sidebar.Content className="before:!content-none after:!content-none">
          {list === 'filters' && <SessionFilters pinned={pinned} groups={groups} profiles={profiles} />}
          {list === 'sessions' && (
            <>
              {pinned.length > 0 && (
                <Sidebar.Group collapsible>
                  <Sidebar.GroupLabel>Pinned</Sidebar.GroupLabel>
                  <Sidebar.Menu>
                    <Sortable
                      as="none"
                      handle
                      items={pinned.map(session => ({
                        id: session.id,
                        label: session.title,
                        content: <SessionRow session={session} reorder actions={actions} />,
                      }))}
                      order={pinnedOrder}
                      onOrderChange={reorderPinned}
                    />
                  </Sidebar.Menu>
                </Sidebar.Group>
              )}

              {groups.map(group => {
                const key = groupKey(group)
                return (
                  <GroupSection
                    key={key}
                    group={group}
                    actions={actions}
                    limit={expanded.includes(key) ? undefined : groupLimit}
                    capped={groupLimit !== undefined && group.sessions.length > groupLimit}
                    keep={group.sessions
                      .filter(s => s.id === selected || keepVisible(s))
                      .map(s => s.id)
                      .join('\n')}
                    onToggle={toggleGroup}
                  />
                )
              })}

              {archived.length > 0 && (
                <Sidebar.Group collapsible defaultOpen={false}>
                  <Sidebar.GroupLabel>Archived</Sidebar.GroupLabel>
                  <Sidebar.Menu>
                    {archived.map(session => (
                      <SessionRow key={session.id} session={session} archived actions={actions} />
                    ))}
                  </Sidebar.Menu>
                </Sidebar.Group>
              )}
            </>
          )}
        </Sidebar.Content>

        <Sidebar.Footer>
          {/* The footer already insets by a group's padding: a second one would sit deeper than the groups above. */}
          <Sidebar.Group collapsible className="p-0">
            <Sidebar.GroupLabel>Usage</Sidebar.GroupLabel>
            <ProfileUsage profiles={profiles} onManage={onOpenSettings} />
          </Sidebar.Group>
          {onOpenSettings && (
            <Sidebar.Menu>
              <Sidebar.MenuItem>
                <Sidebar.MenuButton icon={Settings} onClick={onOpenSettings}>
                  Settings
                  <Kbd variant="plain" className="ml-auto">
                    ⌘,
                  </Kbd>
                </Sidebar.MenuButton>
              </Sidebar.MenuItem>
            </Sidebar.Menu>
          )}
        </Sidebar.Footer>
      </Sidebar>
    </TooltipProvider>
  )
}

export type { SessionSidebarProps }

export { SessionSidebar }
