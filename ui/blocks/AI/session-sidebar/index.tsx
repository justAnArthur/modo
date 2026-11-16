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

import { useMemo } from 'react'
import Kbd from '../../../components/kbd'
import Sidebar from '../../../components/navigation/sidebar'
import { DropdownContent, DropdownMenu, DropdownTrigger, MenuItem } from '../../../components/overlays/dropdown'
import Tooltip from '../../../components/overlays/tooltip'
import { type IconComponent, useIcon } from '../../../lib/icon-context'
import Sortable, { useSortableHandle } from '../../../primitives/sortable'
import { SidebarSearchField } from '../../sidebar-app/search-field'
import { ProfileTile } from '../profile-switcher'
import ProfileUsage from '../profile-usage'
import type { SessionFilter } from '../session-board'
import { STATUS_GLYPH, STATUS_LABEL } from '../status-glyph'
import type { Profile, Session, SessionGroup, SessionStatus } from '../types'

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

interface SessionRowProps {
  session: Session
  /** Inside the pinned Sortable: the actions lead with a grip. */
  reorder?: boolean
  onOpenSplit?: (id: string) => void
}

function SessionRow({ session, reorder, onOpenSplit }: SessionRowProps) {
  const Pin = useIcon('pin')
  const Archive = useIcon('archive')
  const More = useIcon('more-vertical')
  const Pencil = useIcon('pencil')
  const Columns = useIcon('columns-2')
  const Dot = useIcon('circle-dot')
  const Branch = useIcon('git-branch')
  const glyph = STATUS_GLYPH[session.status]
  const children = session.children ?? []

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
      <Sidebar.MenuActions showOnHover>
        {/* Filtered: the cluster sizes the row's gutter by its child count, nulls included. A pinned row trades Archive (in its menu) for the grip. */}
        {[
          reorder && <ReorderAction key="reorder" />,
          <Tooltip key="pin" content={session.pinned ? 'Unpin' : 'Pin'} side="top">
            <Sidebar.MenuAction aria-label={session.pinned ? 'Unpin' : 'Pin'}>
              <Pin />
            </Sidebar.MenuAction>
          </Tooltip>,
          !reorder && (
            <Tooltip key="archive" content="Archive" side="top">
              <Sidebar.MenuAction aria-label="Archive">
                <Archive />
              </Sidebar.MenuAction>
            </Tooltip>
          ),
          <DropdownMenu key="more">
            <DropdownTrigger
              render={
                <Sidebar.MenuAction aria-label="More options">
                  <More />
                </Sidebar.MenuAction>
              }
            />
            <DropdownContent className="w-[240px] min-w-0" align="start" sideOffset={4}>
              <MenuItem
                index={0}
                icon={Columns}
                label="Open in split view"
                onSelect={() => onOpenSplit?.(session.id)}
              />
              <MenuItem index={1} icon={Pencil} label="Rename" />
              <MenuItem index={2} icon={Dot} label="Mark as unread" />
              <MenuItem index={3} icon={Branch} label="Fork into a new session" />
              {reorder && <MenuItem index={4} icon={Archive} label="Archive" />}
            </DropdownContent>
          </DropdownMenu>,
        ].filter(Boolean)}
      </Sidebar.MenuActions>
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
  /** Called with the session id when a row is picked. */
  onValueChange?: (value: string) => void
  /** Called when a row's menu asks to open its session in split view. */
  onOpenSplit?: (id: string) => void
  /** Called by the footer's settings row. */
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
 * archive and a menu that opens the session in split view, renames it or
 * forks it. Sessions started from another one fold under it as linked
 * children. Pick a row and the active background melts over to it.
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
  onOpenSettings,
  variant = 'inset',
  className,
}: SessionSidebarProps) {
  const Plus = useIcon('plus')
  const Board = useIcon('layout-dashboard')
  const Settings = useIcon('settings')
  const Filter = useIcon('sliders-horizontal')
  const waiting = everySession(pinned, groups).filter(s => s.status === 'waiting').length

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
            <Sidebar.MenuItem>
              <Sidebar.MenuButton icon={Plus} value="new">
                New session
                <Kbd variant="plain" className="ml-auto">
                  ⌘N
                </Kbd>
              </Sidebar.MenuButton>
            </Sidebar.MenuItem>
          </Sidebar.Menu>
          <SidebarSearchField placeholder="Search sessions" />
        </div>
      </Sidebar.Header>

      <Sidebar.Content>
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
                    content: <SessionRow session={session} reorder onOpenSplit={onOpenSplit} />,
                  }))}
                  onOrderChange={onPinnedOrderChange}
                />
              </Sidebar.Menu>
            </Sidebar.Group>

            {groups.map(group => (
              <Sidebar.Group key={group.label} collapsible>
                <Sidebar.GroupLabel>{group.label}</Sidebar.GroupLabel>
                <Sidebar.GroupActions>
                  <Tooltip content={group.kind === 'project' ? `New session in ${group.label}` : 'Filter'} side="top">
                    <Sidebar.GroupAction
                      aria-label={group.kind === 'project' ? `New session in ${group.label}` : 'Filter'}
                    >
                      {group.kind === 'project' ? <Plus /> : <Filter />}
                    </Sidebar.GroupAction>
                  </Tooltip>
                </Sidebar.GroupActions>
                <Sidebar.Menu>
                  {group.sessions.map(session => (
                    <SessionRow key={session.id} session={session} onOpenSplit={onOpenSplit} />
                  ))}
                </Sidebar.Menu>
              </Sidebar.Group>
            ))}

            <Sidebar.Group collapsible defaultOpen={false}>
              <Sidebar.GroupLabel>Archived</Sidebar.GroupLabel>
              <Sidebar.Menu>
                {archived.map(session => (
                  <SessionRow key={session.id} session={session} onOpenSplit={onOpenSplit} />
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
      </Sidebar.Footer>
    </Sidebar>
  )
}

export type { SessionSidebarProps }
