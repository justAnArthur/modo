/*!
 * Ported from Fluid Functionalism — github.com/mickadesign/fluid-functionalism
 * `registry/default/lib/sidebar-menu-grid.ts` @ b3587bdbd83fc66c2a6aae3817ffb856cb09260b
 * MIT License © 2026 Micka Touillaud — fluidfunctionalism.com (notice: LICENSE.fluid-functionalism)
 * Local changes: see PORTING.md.
 */

// The rows of a sidebar-anchored menu (the workspace switcher, the user
// menu) on the sidebar's axes: pl-2 puts the leading slot's centre on the
// rows' 16px axis, gap-2 the label on their 32px text axis, pr-1.5 a
// trailing check under the trigger's chevron.
const SIDEBAR_MENU_GRID =
  '[&_[role=menuitem]]:pl-2 [&_[role=menuitem]]:pr-1.5 [&_[role=menuitem]]:gap-2 [&_[role=menuitemradio]]:pl-2 [&_[role=menuitemradio]]:pr-1.5 [&_[role=menuitemradio]]:gap-2'

/** Geometry for a sidebar-anchored dropdown: trigger-width plus 10px, its rows on the sidebar's axes. */
export const SIDEBAR_MENU_POPUP = `min-w-[240px] w-[calc(var(--anchor-width)_+_10px)] ${SIDEBAR_MENU_GRID}`
