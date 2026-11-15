/*!
 * Ported from Fluid Functionalism — github.com/mickadesign/fluid-functionalism
 * `registry/blocks/sidebar-app/search-field.tsx` @ b3587bdbd83fc66c2a6aae3817ffb856cb09260b
 * MIT License © 2026 Micka Touillaud — fluidfunctionalism.com (notice: LICENSE.fluid-functionalism)
 * Local changes: see PORTING.md.
 */

'use client'

import type { ComponentProps } from 'react'
import { SidebarInput } from '../../components/navigation/sidebar'
import { useIcon } from '../../lib/icon-context'
import { useSize } from '../../lib/size-context'

// On the menu rows' axes: the icon on their 16px leading axis, the text
// (pl-8) on their 32px text axis. The shortcut chip shows on hover and focus.

export interface SidebarSearchFieldProps extends Omit<ComponentProps<typeof SidebarInput>, 'className'> {
  /** Keystroke shown in the trailing chip; `null` drops it. Defaults to `'⌘K'`. */
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
