/*
 * Fluid Functionalism's sidebar app shell as the preset `sa1FQfCxH6`
 * (fluidfunctionalism.com/docs/sidebar?preset=sa1FQfCxH6) configures it: the
 * inset layout starting collapsed, a workspace switcher, search and a "New"
 * row in the header, two collapsible thread sections, a row menu on every
 * thread and a user row with two buttons in the footer. The composition is
 * the app-sidebar.tsx and page.tsx that FF's preset generator emits for it
 * (github.com/mickadesign/fluid-functionalism `lib/preset/sidebar-install.ts`
 * @ c367a0d066bc10e663b3d269bc40539ea8417b25), over the sidebar-app,
 * sidebar-workspace-header and sidebar-user-footer blocks ported beside it —
 * MIT License © 2026 Micka Touillaud (notice: LICENSE.fluid-functionalism).
 *
 * Local changes: the selected thread rides the Sidebar's `value` (the rows
 * carry `value`s) and the topbar shows it; the switcher keeps its own pick
 * (`defaultCheckedIndex`); the footer's icon buttons are the DS's ghost
 * `Button`; `variant`, `side`, `openOnHover` and `contained` are props.
 */

import { useState } from 'react'
import Button from '../../components/button'
import { DropdownContent, DropdownMenu, DropdownTrigger, MenuItem } from '../../components/dropdown'
import Sidebar from '../../components/sidebar'
import Tooltip from '../../components/tooltip'
import { useIcon } from '../../lib/icon-context'
import { cn } from '../../lib/utils'
import { SidebarInsetTopbar } from './inset-topbar'
import { NAV_SECTIONS } from './nav-data'
import { SidebarSearchField } from './search-field'
import { SidebarUserFooter } from './user-footer'
import { SidebarWorkspaceHeader, WorkspaceTile } from './workspace-header'

interface SidebarAppProps {
  /** Start with the sidebar open; the preset starts it collapsed. Defaults to `false`. */
  defaultOpen?: boolean
  /** The sidebar's layout (see Sidebar). Defaults to `'inset'`. */
  variant?: 'sidebar' | 'floating' | 'inset'
  /** The edge it sits on. Defaults to `'left'`. */
  side?: 'left' | 'right'
  /** Open the collapsed sidebar while the pointer is at its edge or on the topbar's trigger (see Sidebar). Defaults to `false`. */
  openOnHover?: boolean
  /** Fill the parent box instead of the viewport, as the examples do. Defaults to `false`. */
  contained?: boolean
}

interface AppSidebarProps {
  variant: 'sidebar' | 'floating' | 'inset'
  side: 'left' | 'right'
  className?: string
  value: string
  onValueChange: (value: string) => void
}

function AppSidebar({ variant, side, className, value, onValueChange }: AppSidebarProps) {
  const PlusIcon = useIcon('plus')
  const PencilIcon = useIcon('pencil')
  const MoreVerticalIcon = useIcon('more-vertical')
  const LinkIcon = useIcon('link')
  const UserIcon = useIcon('user')
  const SettingsIcon = useIcon('settings')
  const ArrowLeftIcon = useIcon('arrow-left')
  const MoonIcon = useIcon('moon')

  return (
    <Sidebar variant={variant} side={side} className={className} value={value} onValueChange={onValueChange}>
      <Sidebar.Header>
        <SidebarWorkspaceHeader
          name="Acme Inc"
          tile={<WorkspaceTile>A</WorkspaceTile>}
          defaultCheckedIndex={0}
          menu={
            <>
              <MenuItem index={0} label="Acme Inc" />
              <MenuItem index={1} label="Personal" />
              <MenuItem index={2} icon={PlusIcon} label="New workspace" />
            </>
          }
        />
        {/* Search and the action rows are one block on the menu rows' rhythm. */}
        <div className="flex flex-col gap-0.5">
          <SidebarSearchField />
          <Sidebar.Menu>
            <Sidebar.MenuItem>
              <Sidebar.MenuButton icon={PlusIcon}>
                New
                <span className="ml-auto inline-flex opacity-0 transition-opacity duration-fast group-hover/menu-item:opacity-100 group-focus-within/menu-item:opacity-100">
                  <kbd className="font-sans text-micro text-muted-foreground">⇧⌘O</kbd>
                </span>
              </Sidebar.MenuButton>
            </Sidebar.MenuItem>
          </Sidebar.Menu>
        </div>
      </Sidebar.Header>

      <Sidebar.Content>
        {NAV_SECTIONS.map(section => (
          <Sidebar.Group key={section.label} collapsible>
            <Sidebar.GroupLabel>{section.label}</Sidebar.GroupLabel>
            <Sidebar.GroupActions>
              <Tooltip content="Add item" side="top">
                <Sidebar.GroupAction aria-label="Add item">
                  <PlusIcon />
                </Sidebar.GroupAction>
              </Tooltip>
            </Sidebar.GroupActions>
            <Sidebar.Menu>
              {section.items.map(item => (
                <Sidebar.MenuItem key={item.label}>
                  {/* The status draws the dot and the screen-reader "unread"; the value selects. */}
                  <Sidebar.MenuButton status={item.status} value={item.label}>
                    {item.label}
                  </Sidebar.MenuButton>
                  <DropdownMenu>
                    <DropdownTrigger
                      render={
                        <Sidebar.MenuAction showOnHover aria-label="More options">
                          <MoreVerticalIcon />
                        </Sidebar.MenuAction>
                      }
                    />
                    {/* 240px, the header and footer triggers' width. */}
                    <DropdownContent className="min-w-0 w-[240px]" align="start" sideOffset={4}>
                      <MenuItem index={0} icon={PencilIcon} label="Rename" />
                      <MenuItem index={1} icon={LinkIcon} label="Share" />
                    </DropdownContent>
                  </DropdownMenu>
                </Sidebar.MenuItem>
              ))}
            </Sidebar.Menu>
          </Sidebar.Group>
        ))}
      </Sidebar.Content>

      <Sidebar.Footer>
        <div className="flex items-center gap-1 pr-1.5">
          <SidebarUserFooter
            name="Jane Doe"
            avatar={
              <span className="flex size-5 items-center justify-center rounded-full bg-muted-foreground text-micro-compact text-background">
                J
              </span>
            }
            className="min-w-0 flex-1"
            menu={
              <>
                <MenuItem index={0} icon={UserIcon} label="Profile" />
                <MenuItem index={1} icon={SettingsIcon} label="Settings" />
                <MenuItem index={2} icon={ArrowLeftIcon} label="Log out" />
              </>
            }
          />
          <Tooltip content="Settings" side="top">
            <Button variant="ghost" size="icon-compact" aria-label="Settings" className="size-6 shrink-0">
              <SettingsIcon />
            </Button>
          </Tooltip>
          <Tooltip content="Theme" side="top">
            <Button variant="ghost" size="icon-compact" aria-label="Theme" className="size-6 shrink-0">
              <MoonIcon />
            </Button>
          </Tooltip>
        </div>
      </Sidebar.Footer>
    </Sidebar>
  )
}

/**
 * An app shell around the Sidebar, as Fluid Functionalism's playground preset
 * `sa1FQfCxH6` builds it: the inset layout, starting collapsed.
 *
 * Press the trigger in the topbar (or `[`) to bring the sidebar in. The
 * header holds a workspace switcher, a search field and a "New" row; two
 * thread sections fold from their labels and carry an "Add item" action;
 * every thread shows its status dot and, on hover, a "More options" menu;
 * the footer anchors the user row and two buttons. Pick a thread and the
 * active row melts over to it while the topbar follows.
 *
 * Every overlay grows out of what opened it: the switcher, the user menu
 * and the row menus are Dropdowns, the labels on the buttons are Tooltips,
 * a collapsed sidebar with `openOnHover` slides open from its edge, and below
 * the `md` breakpoint the sidebar is a Sheet growing out of the left edge.
 *
 * @example {@include ./examples.mdx}
 */
export default function SidebarApp({
  defaultOpen = false,
  variant = 'inset',
  side = 'left',
  openOnHover = false,
  contained = false,
}: SidebarAppProps) {
  const [thread, setThread] = useState(NAV_SECTIONS[0]?.items[0]?.label ?? '')

  return (
    <Sidebar.Provider
      defaultOpen={defaultOpen}
      openOnHover={openOnHover}
      className={contained ? 'h-full min-h-0' : undefined}
    >
      <AppSidebar
        variant={variant}
        side={side}
        className={contained ? 'h-full' : undefined}
        value={thread}
        onValueChange={setThread}
      />
      {/* The floating card sits in a p-2 gutter: the topbar drops to line up with it. */}
      <Sidebar.Inset className={cn(contained && 'min-h-0', variant === 'floating' && 'pt-2')}>
        <SidebarInsetTopbar>
          <span className="truncate text-body text-muted-foreground">{thread}</span>
        </SidebarInsetTopbar>
        <main className="flex flex-1 flex-col gap-4 p-4" />
      </Sidebar.Inset>
    </Sidebar.Provider>
  )
}

export type { SidebarAppProps }
