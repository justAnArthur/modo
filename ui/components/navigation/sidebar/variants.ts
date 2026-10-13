// biome-ignore-all lint: vendored upstream code keeps its own patterns (see the header)
/*
 * Ported from Fluid Functionalism — github.com/mickadesign/fluid-functionalism
 * `registry/default/sidebar-menu.tsx` and `registry/default/sidebar-core.tsx`
 * @ b3587bdbd83fc66c2a6aae3817ffb856cb09260b
 * MIT License © 2026 Micka Touillaud — fluidfunctionalism.com (notice: LICENSE.fluid-functionalism)
 * Local modifications: `sidebarMenuButtonVariants`, split out of
 * `sidebar-menu.tsx` unchanged, and the `SIDEBAR_*` constants, as they stand
 * in `sidebar-core.tsx`, moved into a module with no JSX, hooks or contexts,
 * so server code can build the row classes and read the sizes; both files
 * re-export them.
 */

import { cva } from 'class-variance-authority'

export const sidebarMenuButtonVariants = cva(
  // The trailing gutter is an exact reservation published by the row (see
  // rowGutter): --row-gutter at rest, --row-gutter-hover once hover-revealed
  // actions are showing. One rule per state instead of a class per
  // count/badge/reveal combination.
  // Disabled stays in the layout, and pointer events pass through it to the
  // row, since a browser sends no mouse events to a disabled button: the
  // container keeps seeing the moves, and fluid hover simply never lights it.
  'peer/menu-button relative z-10 flex w-full cursor-pointer select-none items-center gap-2 pl-2 text-left outline-none disabled:opacity-50 disabled:pointer-events-none transition-[padding] duration-fast pr-[var(--row-gutter)] group-hover/menu-item:pr-[var(--row-gutter-hover)] group-focus-within/menu-item:pr-[var(--row-gutter-hover)] group-hover/menu-sub-item:pr-[var(--row-gutter-hover)] group-focus-within/menu-sub-item:pr-[var(--row-gutter-hover)] group-has-[[data-sidebar=menu-action]:is([data-state=open],[data-popup-open],[aria-expanded=true])]/menu-item:pr-[var(--row-gutter-hover)] group-has-[[data-sidebar=menu-action]:is([data-state=open],[data-popup-open],[aria-expanded=true])]/menu-sub-item:pr-[var(--row-gutter-hover)]',
  {
    variants: {
      variant: {
        default: '',
        outline: 'border border-border bg-background',
      },
    },
    defaultVariants: { variant: 'default' },
  },
)

export const SIDEBAR_COOKIE_NAME = 'sidebar_state'
export const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7
export const SIDEBAR_WIDTH = '16rem'
export const SIDEBAR_WIDTH_MOBILE = '18rem'
/** Bare-key toggle defaults: "[" for a left sidebar, "]" for a right one.
 *  Bare (no ⌘/Ctrl) so the browser's history shortcuts stay untouched. */
export const SIDEBAR_KEYBOARD_SHORTCUT = '['
export const SIDEBAR_KEYBOARD_SHORTCUT_RIGHT = ']'
/** Drag-resize clamp for the built-in rail handle (px). */
export const SIDEBAR_MIN_WIDTH = 160
export const SIDEBAR_MAX_WIDTH = 360
/** Dragging this far past the minimum width collapses the sidebar instead of
 *  bottoming out — the same "throw it at the edge to dismiss" affordance
 *  native apps use. */
export const SIDEBAR_COLLAPSE_SLOP = 56
/** Open on hover: the strip past the sidebar's inner edge that opens it, and
 *  how close a trigger must sit to that edge to widen the strip to its own
 *  far side (px). */
export const SIDEBAR_HOVER_STRIP = 12
export const SIDEBAR_HOVER_TRIGGER_GAP = 24
