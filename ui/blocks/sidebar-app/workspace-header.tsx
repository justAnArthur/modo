// biome-ignore-all lint: vendored upstream code keeps its own patterns (see the header)
/*
 * Ported from Fluid Functionalism — github.com/mickadesign/fluid-functionalism
 * `registry/blocks/sidebar-workspace-header.tsx` @ b3587bdbd83fc66c2a6aae3817ffb856cb09260b
 * MIT License © 2026 Micka Touillaud — fluidfunctionalism.com (notice: LICENSE.fluid-functionalism)
 * Local modifications:
 * - `"use client"` dropped; `@/components/ui/{sidebar,dropdown}` → `../../components/*`,
 *   `@/lib/sidebar-menu-grid` → `./menu-grid`, `@/lib/*` → `../../lib/*`.
 * - Styling reads DS tokens (AGENTS.md styling): inline
 *   `fontVariationSettings` → `weight-semibold`; `text-[13px]` / `text-[10px]`
 *   → `text-body` / `text-micro-compact`; `duration-80` → `duration-fast`.
 * - `defaultCheckedIndex` passed through to the menu, so a switcher keeps its
 *   own pick (the Dropdown's uncontrolled selection).
 * - No peek trigger: the sidebar opens on hover in flow (the provider's
 *   `openOnHover`), the topbar's trigger stays beside it, so the tile no
 *   longer cross-fades with a trigger over the row.
 */

import { type ReactNode } from 'react'
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '../../components/navigation/sidebar'
import { DropdownContent, DropdownMenu, DropdownTrigger } from '../../components/overlays/dropdown'
import { useIcon } from '../../lib/icon-context'
import { useShape } from '../../lib/shape-context'
import { useSize } from '../../lib/size-context'
import { cn } from '../../lib/utils'
import { SIDEBAR_MENU_POPUP } from './menu-grid'

// ---------------------------------------------------------------------------
// Workspace brand row for a sidebar header. The row's pl-8 keeps the name on
// the rows' 32px text axis, the tile in the leading slot.
// ---------------------------------------------------------------------------

export interface SidebarWorkspaceHeaderProps {
  /** Workspace or product name shown in the row. */
  name: ReactNode
  /** 20px mark for the leading slot — a letter tile (see WorkspaceTile), a
   *  logo, an avatar. The header positions and cross-fades it; the mark owns
   *  its own colors and rounding. */
  tile: ReactNode
  /** Dropdown content (MenuItem rows). Omit to render a non-interactive logo
   *  lockup instead of a workspace switcher. */
  menu?: ReactNode
  /** Index of the checked menu row, forwarded to DropdownContent. */
  checkedIndex?: number
  /** Initially checked menu row, for a switcher that keeps its own pick. */
  defaultCheckedIndex?: number
}

export function SidebarWorkspaceHeader({
  name,
  tile,
  menu,
  checkedIndex,
  defaultCheckedIndex,
}: SidebarWorkspaceHeaderProps) {
  const iconSize = useSize().icon
  const ChevronDown = useIcon('chevron-down')

  // The tile sits absolutely in the row's leading slot — 20px at left-1.5
  // centres it on the rows' 16px leading icon axis.
  const tileSlot = (
    <span aria-hidden className="pointer-events-none absolute left-1.5 top-1/2 -translate-y-1/2">
      {tile}
    </span>
  )
  const nameSpan = <span className="min-w-0 truncate text-body weight-semibold text-foreground">{name}</span>

  if (!menu) {
    // Not interactive, so it renders outside SidebarMenu — a menu row would
    // track the traveling hover background.
    return (
      <div className="relative flex h-8 items-center pl-8 pr-2">
        {tileSlot}
        {nameSpan}
      </div>
    )
  }
  return (
    // @container: the row hides its dropdown chevron once it gets too narrow
    // to show a useful slice of the name (squeezed by trailing header actions
    // or a mid-drag width) — the text keeps whatever room is left.
    <SidebarMenu aria-label="Workspace" className="@container">
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownTrigger
            render={
              <SidebarMenuButton aria-label="Switch workspace" className="pl-8">
                {tileSlot}
                {nameSpan}
                <span className="ml-auto inline-flex @max-[7rem]:hidden">
                  <ChevronDown size={iconSize} strokeWidth={1.5} className="text-muted-foreground" />
                </span>
              </SidebarMenuButton>
            }
          />
          {/* Trigger-width popup on the shared sidebar menu grid: items start
              at the row's edge, icon slots land on the leading axis, and the
              check sits on the chevron's vertical axis. */}
          <DropdownContent
            className={SIDEBAR_MENU_POPUP}
            align="start"
            sideOffset={4}
            checkedIndex={checkedIndex}
            defaultCheckedIndex={defaultCheckedIndex}
          >
            {menu}
          </DropdownContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}

/** The 20px letter-tile treatment the switcher's trigger and its menu rows
 *  share — squared to the shape system, semibold 10px glyph. */
export function WorkspaceTile({ children, className }: { children: ReactNode; className?: string }) {
  const shape = useShape()
  return (
    <span
      className={cn(
        'flex size-5 shrink-0 items-center justify-center bg-foreground text-micro-compact weight-semibold text-background',
        shape.bgRadius >= 20 ? 'rounded-full' : 'rounded-md',
        className,
      )}
    >
      {children}
    </span>
  )
}
