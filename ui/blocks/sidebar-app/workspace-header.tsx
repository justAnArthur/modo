/*!
 * Ported from Fluid Functionalism — github.com/mickadesign/fluid-functionalism
 * `registry/blocks/sidebar-workspace-header.tsx` @ b3587bdbd83fc66c2a6aae3817ffb856cb09260b
 * MIT License © 2026 Micka Touillaud — fluidfunctionalism.com (notice: LICENSE.fluid-functionalism)
 * Local changes: see PORTING.md.
 */

'use client'

import type { ReactNode } from 'react'
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '../../components/navigation/sidebar'
import { DropdownContent, DropdownMenu, DropdownTrigger } from '../../components/overlays/dropdown'
import { useIcon } from '../../lib/icon-context'
import { useShape } from '../../lib/shape-context'
import { useSize } from '../../lib/size-context'
import { cn } from '../../lib/utils'
import { SIDEBAR_MENU_POPUP } from './menu-grid'

// The row's pl-8 keeps the name on the rows' 32px text axis, the tile in the leading slot.

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

  // 20px at left-1.5 centres the tile on the rows' 16px leading axis.
  const tileSlot = (
    <span aria-hidden className="pointer-events-none absolute left-1.5 top-1/2 -translate-y-1/2">
      {tile}
    </span>
  )
  const nameSpan = <span className="min-w-0 truncate text-body weight-semibold text-foreground">{name}</span>

  if (!menu) {
    // Not interactive: outside SidebarMenu, so the hover never lands on it.
    return (
      <div className="relative flex h-8 items-center pl-8 pr-2">
        {tileSlot}
        {nameSpan}
      </div>
    )
  }
  return (
    // @container: too narrow for a useful slice of the name, the row drops its chevron.
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
