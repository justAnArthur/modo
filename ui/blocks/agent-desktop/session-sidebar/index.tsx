/*!
 * Local addition: the agent desktop's sessions sidebar, composed on Sidebar
 * the way the SidebarApp block is: the profile switcher, a "New session" row
 * and search in the header; pinned sessions, project groups and the user's
 * own sections, an archive; and a settings row in the footer. A session row
 * shows its run state (running, needs input, unread, idle), its last activity
 * and, on hover, pin, archive and a row menu with "Open in split view".
 * Linked child sessions fold under their parent.
 */

'use client'

import Sidebar from '../../../components/navigation/sidebar'
import { DropdownContent, DropdownMenu, DropdownTrigger, MenuItem } from '../../../components/overlays/dropdown'
import Tooltip from '../../../components/overlays/tooltip'
import { useIcon } from '../../../lib/icon-context'
import { SidebarSearchField } from '../../sidebar-app/search-field'
import { ARCHIVED, GROUPS, PINNED, type Session, type SessionGroup } from '../mock'
import ProfileUsage from '../profile-usage'
import { STATUS_GLYPH, STATUS_LABEL } from '../status-glyph'

interface SessionRowProps {
  session: Session
  onOpenSplit?: (id: string) => void
}

function SessionRow({ session, onOpenSplit }: SessionRowProps) {
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
        <Tooltip content={session.pinned ? 'Unpin' : 'Pin'} side="top">
          <Sidebar.MenuAction aria-label={session.pinned ? 'Unpin' : 'Pin'}>
            <Pin />
          </Sidebar.MenuAction>
        </Tooltip>
        <Tooltip content="Archive" side="top">
          <Sidebar.MenuAction aria-label="Archive">
            <Archive />
          </Sidebar.MenuAction>
        </Tooltip>
        <DropdownMenu>
          <DropdownTrigger
            render={
              <Sidebar.MenuAction aria-label="More options">
                <More />
              </Sidebar.MenuAction>
            }
          />
          <DropdownContent className="w-[240px] min-w-0" align="start" sideOffset={4}>
            <MenuItem index={0} icon={Columns} label="Open in split view" onSelect={() => onOpenSplit?.(session.id)} />
            <MenuItem index={1} icon={Pencil} label="Rename" />
            <MenuItem index={2} icon={Dot} label="Mark as unread" />
            <MenuItem index={3} icon={Branch} label="Fork into a new session" />
          </DropdownContent>
        </DropdownMenu>
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

interface SessionSidebarProps {
  /** Pinned sessions, above every group. Defaults to the mock pins. */
  pinned?: Session[]
  /** Project folders and the user's own sections, in order. Defaults to the mock groups. */
  groups?: SessionGroup[]
  /** Archived sessions, folded at the bottom. Defaults to the mock archive. */
  archived?: Session[]
  /** Controlled selected session id. Pair with `onValueChange`. */
  value?: string
  /** Initial selected session id, for an uncontrolled sidebar. Defaults to `'agent-desktop'`. */
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
 * The agent desktop's sessions rail: every session of every profile,
 * grouped by project, with what each one is doing right now.
 *
 * Sessions of every profile sit side by side, so there is no profile to
 * switch: the header opens the overview of every session (see the session
 * board), starts a new session and searches, and the footer shows how much
 * each profile has left (see the profile usage). Below it come the pinned sessions, then one group
 * per project folder and per section you made, then the archive, folded.
 * A row's leading glyph is its state: an arc turning while it runs, an
 * amber dot while it waits for you, a filled dot for an unread reply and a
 * ring when idle; its badge is the last activity. Hover a row for pin,
 * archive and a menu that opens the session in split view, renames it or
 * forks it. Sessions started from another one fold under it as linked
 * children. Pick a row and the active background melts over to it.
 *
 * Put it inside a `Sidebar.Provider`, next to the `Sidebar.Inset` that holds
 * the session.
 *
 * @example {@include ./examples.mdx}
 */
export default function SessionSidebar({
  pinned = PINNED,
  groups = GROUPS,
  archived = ARCHIVED,
  value,
  defaultValue = 'agent-desktop',
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
                <span className="ml-auto text-micro tabular-nums text-muted-foreground">2 need you</span>
              </Sidebar.MenuButton>
            </Sidebar.MenuItem>
            <Sidebar.MenuItem>
              <Sidebar.MenuButton icon={Plus} value="new">
                New session
                <kbd className="ml-auto font-sans text-micro text-muted-foreground">⌘N</kbd>
              </Sidebar.MenuButton>
            </Sidebar.MenuItem>
          </Sidebar.Menu>
          <SidebarSearchField placeholder="Search sessions" />
        </div>
      </Sidebar.Header>

      <Sidebar.Content>
        <Sidebar.Group collapsible>
          <Sidebar.GroupLabel>Pinned</Sidebar.GroupLabel>
          <Sidebar.Menu>
            {pinned.map(session => (
              <SessionRow key={session.id} session={session} onOpenSplit={onOpenSplit} />
            ))}
          </Sidebar.Menu>
        </Sidebar.Group>

        {groups.map(group => (
          <Sidebar.Group key={group.label} collapsible>
            <Sidebar.GroupLabel>{group.label}</Sidebar.GroupLabel>
            <Sidebar.GroupActions>
              <Tooltip content={group.kind === 'project' ? `New session in ${group.label}` : 'Filter'} side="top">
                <Sidebar.GroupAction aria-label={group.kind === 'project' ? `New session in ${group.label}` : 'Filter'}>
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
      </Sidebar.Content>

      <Sidebar.Footer>
        <Sidebar.Group>
          <Sidebar.GroupLabel>Usage</Sidebar.GroupLabel>
          <ProfileUsage onManage={onOpenSettings} />
        </Sidebar.Group>
        <Sidebar.Menu>
          <Sidebar.MenuItem>
            <Sidebar.MenuButton icon={Settings} onClick={onOpenSettings}>
              Settings
              <kbd className="ml-auto font-sans text-micro text-muted-foreground">⌘,</kbd>
            </Sidebar.MenuButton>
          </Sidebar.MenuItem>
        </Sidebar.Menu>
      </Sidebar.Footer>
    </Sidebar>
  )
}

export type { SessionSidebarProps }
