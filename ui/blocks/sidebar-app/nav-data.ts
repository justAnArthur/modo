/*
 * Ported from Fluid Functionalism — the seed navigation that
 * github.com/mickadesign/fluid-functionalism `lib/preset/sidebar-install.ts`
 * (@ c367a0d066bc10e663b3d269bc40539ea8417b25) generates for the sidebar
 * preset `sa1FQfCxH6` (threads, two sections). MIT License © 2026 Micka
 * Touillaud — fluidfunctionalism.com (notice: LICENSE.fluid-functionalism).
 */

export interface NavItem {
  label: string
  /** Semantic status: drives the leading dot and screen-reader text. */
  status: 'active' | 'unread' | 'idle'
}

export interface NavSection {
  label: string
  items: NavItem[]
}

export const NAV_SECTIONS: NavSection[] = [
  {
    label: 'fluid-functionalism',
    items: [
      { label: 'New pricing page exploration', status: 'active' },
      { label: 'Component library audit', status: 'idle' },
      { label: 'Dark mode token pass', status: 'unread' },
    ],
  },
  {
    label: 'portfolio-site',
    items: [
      { label: 'Scrollbar fade regression', status: 'idle' },
      { label: 'Registry deploy pipeline', status: 'unread' },
    ],
  },
]
