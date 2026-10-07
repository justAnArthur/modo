// biome-ignore-all lint: vendored upstream code keeps its own patterns (see the header)
/*
 * Ported from Fluid Functionalism — github.com/mickadesign/fluid-functionalism
 * `registry/blocks/sidebar-app/inset-topbar.tsx` @ b3587bdbd83fc66c2a6aae3817ffb856cb09260b
 * MIT License © 2026 Micka Touillaud — fluidfunctionalism.com (notice: LICENSE.fluid-functionalism)
 * Local modifications:
 * - `"use client"` dropped; `@/components/ui/{sidebar,dropdown}` → `../../components/*`,
 *   `@/lib/sidebar-menu-grid` → `./menu-grid`, `@/lib/*` → `../../lib/*`.
 * - No peek to hide behind: the sidebar opens on hover in flow (the
 *   provider's `openOnHover`), so the trigger stays, riding the inset's edge.
 */

import { type ReactNode } from 'react'
import { SidebarTrigger } from '../../components/sidebar'
import { cn } from '../../lib/utils'

// The main region's topbar, its trigger first.
export function SidebarInsetTopbar({ children, className }: { children?: ReactNode; className?: string }) {
  return (
    <header className={cn('flex h-12 shrink-0 items-center gap-2 px-1.5', className)}>
      <SidebarTrigger />
      {children}
    </header>
  )
}
