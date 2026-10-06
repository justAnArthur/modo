// biome-ignore-all lint: vendored upstream code keeps its own patterns (see the header)
/*
 * Ported from Fluid Functionalism — github.com/mickadesign/fluid-functionalism
 * `registry/blocks/sidebar-app/inset-topbar.tsx` @ b3587bdbd83fc66c2a6aae3817ffb856cb09260b
 * MIT License © 2026 Micka Touillaud — fluidfunctionalism.com (notice: LICENSE.fluid-functionalism)
 * Local modifications:
 * - `"use client"` dropped; `@/components/ui/{sidebar,dropdown}` → `../../components/*`,
 *   `@/lib/sidebar-menu-grid` → `./menu-grid`, `@/lib/*` → `../../lib/*`.
 * - Styling reads DS tokens (AGENTS.md styling): `delay-200 duration-160` →
 *   `delay-slow duration-moderate`.
 */

import { type ReactNode } from 'react'
import { SidebarTrigger, useSidebar } from '../../components/sidebar'
import { cn } from '../../lib/utils'

// ---------------------------------------------------------------------------
// The main region's topbar. While the sidebar is only PEEKED the trigger
// hides (the overlay covers it anyway); after a pin it fades back in
// slightly late, so it appears at its settled position instead of riding
// the inset's slide.
// ---------------------------------------------------------------------------

export function SidebarInsetTopbar({ children, className }: { children?: ReactNode; className?: string }) {
  const { isPeeking } = useSidebar()
  return (
    <header className={cn('flex h-12 shrink-0 items-center gap-2 px-1.5', className)}>
      <SidebarTrigger
        className={`transition-opacity delay-slow duration-moderate ${isPeeking ? 'opacity-0' : 'opacity-100'}`}
      />
      {children}
    </header>
  )
}
