/*
 * Ported from Fluid Functionalism — github.com/mickadesign/fluid-functionalism
 * `registry/default/lib/sidebar-menu-grid.ts` @ b3587bdbd83fc66c2a6aae3817ffb856cb09260b
 * MIT License © 2026 Micka Touillaud — fluidfunctionalism.com (notice: LICENSE.fluid-functionalism)
 * Local modifications:
 * - The width reads Base UI's `--anchor-width` only (the Radix fallback goes).
 * - The `-ml-1` shift is dropped: the class lands on the morph surface's
 *   content, which would slide off its own background.
 */

/**
 * Shared geometry for sidebar-anchored dropdown menus (the workspace switcher
 * in the header, the user menu in the footer).
 *
 * The popup is trigger-width plus 10px, so that:
 *  - the leading icon slot's centre lands on the sidebar rows' 16px leading
 *    axis (pl-2, with a 20px letter-tile overhanging the 16px slot by 2px a
 *    side),
 *  - gap-2 lands the label on the rows' 32px text axis, and
 *  - pr-1.5 puts a trailing glyph (the check) on the trigger chevron's
 *    vertical axis.
 */
export const SIDEBAR_MENU_GRID =
  '[&_[role=menuitem]]:pl-2 [&_[role=menuitem]]:pr-1.5 [&_[role=menuitem]]:gap-2 [&_[role=menuitemradio]]:pl-2 [&_[role=menuitemradio]]:pr-1.5 [&_[role=menuitemradio]]:gap-2'

export const SIDEBAR_MENU_POPUP = `min-w-[240px] w-[calc(var(--anchor-width)_+_10px)] ${SIDEBAR_MENU_GRID}`
