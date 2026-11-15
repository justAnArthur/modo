/*!
 * Ported from Fluid Functionalism — github.com/mickadesign/fluid-functionalism
 * `registry/blocks/sidebar-app/inset-topbar.tsx` @ b3587bdbd83fc66c2a6aae3817ffb856cb09260b
 * MIT License © 2026 Micka Touillaud — fluidfunctionalism.com (notice: LICENSE.fluid-functionalism)
 * Local changes: see PORTING.md.
 */

import type { ReactNode } from 'react'
import { SidebarTrigger } from '../../components/navigation/sidebar'
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
