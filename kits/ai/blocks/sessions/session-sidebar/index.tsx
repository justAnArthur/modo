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
import Tooltip from '@justanarthur/modo-ui/components/overlays/tooltip'
import Sortable, { useSortableHandle } from '@justanarthur/modo-ui/primitives/layout/sortable'
import { useMemo } from 'react'
import { type IconComponent, useIcon } from '../../../lib/icons'
import { STATUS_GLYPH, STATUS_LABEL } from '../../../lib/status-glyph'
import type { Profile, Session, SessionGroup, SessionStatus } from '../../../lib/types'
import { ProfileTile } from '../../profiles/profile-switcher'
import ProfileUsage from '../../profiles/profile-usage'
import Inbox, { type InboxAction, type InboxItem } from '../inbox'
import type { SessionFilter } from '../session-board'

const STATES: { status: SessionStatus; label: string }[] = [
  { status: 'waiting', label: 'Needs you' },
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

/** What a row's hover actions and menu call. An action whose callback is absent is left out. */
type RowActions = Pick<
  SessionSidebarProps,
  'onOpenSplit' | 'onPin' | 'onArchive' | 'onRename' | 'onMarkUnread' | 'onFork'
>

interface SessionRowProps {
  session: Session
  /** Inside the pinned Sortable: the actions lead with a grip. */
  reorder?: boolean
  /** Inside the archive: Archive becomes Unarchive. */
  archived?: boolean
  actions: RowActions
}

function SessionRow({ session, reorder, archived = false, actions }: SessionRowProps) {
  const { onOpenSplit, onPin, onArchive, onRename, onMarkUnread, onFork } = actions
  const Pin = useIcon('pin')
  const Archive = useIcon('archive')
  const More = useIcon('more-vertical')
  const Pencil = useIcon('pencil')
  const Columns = useIcon('columns-2')
  const Dot = useIcon('circle-dot')
  const Branch = useIcon('git-branch')
  const glyph = STATUS_GLYPH[session.status]
  const children = session.children ?? []
  const pinLabel = session.pinned ? 'Unpin' : 'Pin'
  const archiveLabel = archived ? 'Unarchive' : 'Archive'

  const menu = [
    onOpenSplit && (
      <MenuItem key="split" icon={Columns} label="Open in split view" onSelect={() => onOpenSplit(session.id)} />
    ),
    onRename && <MenuItem key="rename" icon={Pencil} label="Rename" onSelect={() => onRename(session.id)} />,
    onMarkUnread && session.status !== 'unread' && (
      <MenuItem key="unread" icon={Dot} label="Mark as unread" onSelect={() => onMarkUnread(session.id)} />
    ),
    onFork && <MenuItem key="fork" icon={Branch} label="Fork into a new session" onSelect={() => onFork(session.id)} />,
    reorder && onArchive && (
      <MenuItem key="archive" icon={Archive} label={archiveLabel} onSelect={() => onArchive(session.id, !archived)} />
    ),
  ].filter(Boolean)

  // Filtered: the cluster sizes the row's gutter by its child count, nulls included. A pinned row trades Archive (in its menu) for the grip.
  const cluster = [
    reorder && <ReorderAction key="reorder" />,
    onPin && (
      <Tooltip key="pin" content={pinLabel} side="top">
        <Sidebar.MenuAction aria-label={pinLabel} onClick={() => onPin(session.id, !session.pinned)}>
          <Pin />
        </Sidebar.MenuAction>
      </Tooltip>
    ),
    !reorder && onArchive && (
      <Tooltip key="archive" content={archiveLabel} side="top">
        <Sidebar.MenuAction aria-label={archiveLabel} onClick={() => onArchive(session.id, !archived)}>
          <Archive />
        </Sidebar.MenuAction>
      </Tooltip>
    ),
    menu.length > 0 && (
      <DropdownMenu key="more">
        <DropdownTrigger
          render={
            <Sidebar.MenuAction aria-label="More options">
              <More />
            </Sidebar.MenuAction>
          }
        />
        <DropdownContent className="w-[240px] min-w-0" align="start" sideOffset={4}>
          {menu}
        </DropdownContent>
      </DropdownMenu>
    ),
  ].filter(Boolean)

  return (
    <Sidebar.MenuItem
      collapsible={children.length > 0 ? true : undefined}
      defaultOpen={children.length > 0 ? true : undefined}
    >
      <Sidebar.MenuButton
        value={session.id}
        icon={glyph}
        status={glyph ? undefined : session.status === 'unread' ? 'unread' : 'idle'}
        title={`${session.title} · ${STATUS_LABEL[session.status]} · ${session.profile}`}
      >
        <span className="truncate">{session.title}</span>
      </Sidebar.MenuButton>
      <Sidebar.MenuBadge>{session.updated}</Sidebar.MenuBadge>
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
    </Sidebar.MenuItem>
  )
}

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
  const projects = groups.filter(g => g.kind === 'project')
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
          {projects.map(({ label }) => (
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
  /** Pinned sessions, above every group, in the order you dragged them into. */
  pinned: Session[]
  /** Called with the pinned sessions' ids after one is dragged to a new place. */
  onPinnedOrderChange?: (ids: string[]) => void
  /** Project folders and the user's own sections, in order. */
  groups: SessionGroup[]
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
 * @example {@include ./examples.mdx}
 */
export default function SessionSidebar({
  pinned,
  groups,
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
  const Filter = useIcon('sliders-horizontal')
  const Bell = useIcon('bell')
  const unread = inbox?.filter(item => !item.read).length ?? 0
  const waiting = everySession(pinned, groups).filter(s => s.status === 'waiting').length
  const actions = { onOpenSplit, onPin, onArchive, onRename, onMarkUnread, onFork }

  return (
    <Sidebar
      variant={variant}
      className={className}
      value={value}
      defaultValue={value === undefined ? defaultValue : undefined}
      onValueChange={onValueChange}
    >
      <Sidebar.Header>
        <div className="flex flex-col gap-0.5">
          <Sidebar.Menu>
            <Sidebar.MenuItem>
              <Sidebar.MenuButton icon={Board} value="overview">
                Overview
                <span className="ml-auto text-micro tabular-nums text-muted-foreground">{waiting} need you</span>
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
                  onOrderChange={onPinnedOrderChange}
                />
              </Sidebar.Menu>
            </Sidebar.Group>

            {groups.map(group => {
              const isProject = group.kind === 'project'
              const onAction = isProject ? onNewSessionIn : onFilterSection
              const label = isProject ? `New session in ${group.label}` : 'Filter'
              return (
                <Sidebar.Group key={group.label} collapsible>
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
                    {group.sessions.map(session => (
                      <SessionRow key={session.id} session={session} actions={actions} />
                    ))}
                  </Sidebar.Menu>
                </Sidebar.Group>
              )
            })}

            <Sidebar.Group collapsible defaultOpen={false}>
              <Sidebar.GroupLabel>Archived</Sidebar.GroupLabel>
              <Sidebar.Menu>
                {archived.map(session => (
                  <SessionRow key={session.id} session={session} archived actions={actions} />
                ))}
              </Sidebar.Menu>
            </Sidebar.Group>
          </>
        )}
      </Sidebar.Content>

      <Sidebar.Footer>
        <Sidebar.Group collapsible>
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
  )
}

export type { SessionSidebarProps }

export { SessionSidebar }
