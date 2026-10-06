// biome-ignore-all lint: vendored upstream code keeps its own patterns (see the header)
/*
 * Ported from Fluid Functionalism — github.com/mickadesign/fluid-functionalism
 * `registry/blocks/sidebar-app/search-field.tsx` @ b3587bdbd83fc66c2a6aae3817ffb856cb09260b
 * MIT License © 2026 Micka Touillaud — fluidfunctionalism.com (notice: LICENSE.fluid-functionalism)
 * Local modifications:
 * - `"use client"` dropped; `@/components/ui/{sidebar,dropdown}` → `../../components/*`,
 *   `@/lib/sidebar-menu-grid` → `./menu-grid`, `@/lib/*` → `../../lib/*`.
 * - Styling reads DS tokens (AGENTS.md styling): `text-[11px]` → `text-micro`;
 *   `duration-80` → `duration-fast`.
 */

import { type ComponentProps } from 'react'
import { SidebarInput } from '../../components/sidebar'
import { useIcon } from '../../lib/icon-context'
import { useSize } from '../../lib/size-context'

// ---------------------------------------------------------------------------
// The header's search field, on the menu rows' own rhythm. The leading icon
// sits on the rows' 16px leading axis; pl-8 starts the text on the rows'
// 32px text axis; and the shortcut chip waits at the trailing edge, revealed
// on hover/focus — the placeholder owns the field at rest.
// ---------------------------------------------------------------------------

export interface SidebarSearchFieldProps extends Omit<ComponentProps<typeof SidebarInput>, 'className'> {
  /** Keystroke shown in the trailing chip. Pass null to drop the chip. */
  shortcut?: string | null
}

export function SidebarSearchField({ placeholder = 'Search…', shortcut = '⌘K', ...props }: SidebarSearchFieldProps) {
  const iconSize = useSize().icon
  const SearchIcon = useIcon('search')
  return (
    <div className="group/search relative">
      <SearchIcon
        size={iconSize}
        strokeWidth={1.5}
        className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground"
      />
      <SidebarInput placeholder={placeholder} aria-label="Search" className="pl-8 pr-12" {...props} />
      {shortcut && (
        <kbd className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 font-sans text-micro text-muted-foreground opacity-0 transition-opacity duration-fast group-hover/search:opacity-100 group-focus-within/search:opacity-100">
          {shortcut}
        </kbd>
      )}
    </div>
  )
}
