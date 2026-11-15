/*!
 * Ported from Fluid Functionalism — github.com/mickadesign/fluid-functionalism
 * `registry/blocks/sidebar-user-footer.tsx` @ b3587bdbd83fc66c2a6aae3817ffb856cb09260b
 * MIT License © 2026 Micka Touillaud — fluidfunctionalism.com (notice: LICENSE.fluid-functionalism)
 * Local changes: see PORTING.md.
 */

'use client'

import type { ReactNode } from 'react'
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '../../components/navigation/sidebar'
import { DropdownContent, DropdownMenu, DropdownTrigger } from '../../components/overlays/dropdown'
import { useIcon } from '../../lib/icon-context'
import { useSize } from '../../lib/size-context'
import { cn } from '../../lib/utils'
import { SIDEBAR_MENU_POPUP } from './menu-grid'

// The 20px avatar pulls -ml-0.5 onto the rows' leading axis and the chevron's
// 24px slot -mr-0.5 onto the trailing action axis. The menu opens upward on
// the shared sidebar menu grid.

export interface SidebarUserFooterProps {
  /** Display name shown in the row. */
  name: ReactNode
  /** 20px avatar — e.g. <img className="size-5 rounded-full" …/>. The row
   *  positions it on the leading icon axis; the element owns its look. */
  avatar: ReactNode
  /** Dropdown content (MenuItem rows). */
  menu: ReactNode
  /** Extra classes for the wrapping SidebarMenu — pass "min-w-0 flex-1" when
   *  the row shares a horizontal footer line with icon buttons. */
  className?: string
}

export function SidebarUserFooter({ name, avatar, menu, className }: SidebarUserFooterProps) {
  const iconSize = useSize().icon
  const ChevronsUpDown = useIcon('chevrons-up-down')
  return (
    <SidebarMenu aria-label="User" className={cn(className)}>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownTrigger
            render={
              <SidebarMenuButton aria-label="Open user menu">
                <span className="-ml-0.5 -mr-0.5 flex size-5 shrink-0 items-center justify-center">{avatar}</span>
                <span className="min-w-0 truncate text-body text-foreground">{name}</span>
                <span className="ml-auto -mr-0.5 flex size-6 shrink-0 items-center justify-center">
                  <ChevronsUpDown size={iconSize} strokeWidth={1.5} className="text-muted-foreground" />
                </span>
              </SidebarMenuButton>
            }
          />
          <DropdownContent className={SIDEBAR_MENU_POPUP} side="top" align="start" sideOffset={6}>
            {menu}
          </DropdownContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
