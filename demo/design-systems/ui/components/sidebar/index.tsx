// biome-ignore-all lint: vendored upstream code keeps its own patterns (see the header)
/*
 * Ported from Fluid Functionalism — github.com/mickadesign/fluid-functionalism
 * `registry/base/sidebar.tsx` @ b3587bdbd83fc66c2a6aae3817ffb856cb09260b
 * MIT License © 2026 Micka Touillaud — fluidfunctionalism.com (notice: LICENSE.fluid-functionalism)
 * Local modifications:
 * - `"use client"` dropped; `framer-motion` → `motion/react`; `@/lib/*`
 *   imports rewritten to `../../lib/*`, `@/components/ui/scroll-area` →
 *   `../../primitives/scroll-area`, `@/components/ui/sidebar-{core,menu}` →
 *   the siblings `./sidebar-core` / `./sidebar-menu`.
 * - The mobile sheet is the DS's `Sheet` (Base UI Drawer through the morph
 *   layer): it grows out of its edge with the goo neck on `spring.moderate`
 *   and swipes away, replacing upstream's Dialog with a framer slide, its
 *   held-open exit and its `bg-black` scrim.
 * - `SidebarProps` re-declared one member per line with the FF docs text;
 *   `value` / `defaultValue` / `onValueChange` added: the sidebar holds the
 *   selection its menu buttons' `value`s read (`SidebarSelection`), so rows
 *   select without state of their own.
 * - The parts hang off `Sidebar` as statics (`Sidebar.Provider`,
 *   `Sidebar.Menu`, …), typed through a `SidebarComponent` cast; upstream's
 *   named re-exports are kept.
 * - Upstream's `.scroll-divider` (app/globals.css) ships beside it as
 *   `sidebar.css`.
 */

import {
  type CSSProperties,
  type ForwardRefExoticComponent,
  forwardRef,
  type HTMLAttributes,
  type ReactNode,
  type RefAttributes,
  useEffect,
  useMemo,
} from 'react'
import { useControllableState } from '../../lib/use-controllable-state'
import { cn } from '../../lib/utils'
import { ScrollArea } from '../../primitives/scroll-area'
import { Sheet } from '../sheet'
import {
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupActions,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarInset,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarShell,
  type SidebarSide,
  SidebarTrigger,
  useSidebar,
} from './sidebar-core'
import {
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuActions,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarSelection,
} from './sidebar-menu'

// ─── Mobile sheet ────────────────────────────────────────────────────────────
//
// The DS's Sheet: Base UI Drawer (swipe to dismiss, scroll lock, focus trap
// and restore, Esc + outside-press dismissal) with the panel growing out of
// its edge through the morph layer, so no exit needs holding open here.

function SidebarSheet({ side, children }: { side: SidebarSide; children: ReactNode }) {
  const { openMobile, setOpenMobile, widthMobile } = useSidebar()
  return (
    <Sheet side={side} open={openMobile} onOpenChange={setOpenMobile}>
      <Sheet.Content
        aria-label="Sidebar"
        data-sidebar="sidebar"
        data-mobile="true"
        data-side={side}
        tier="moderate"
        className="gap-0 overflow-hidden p-0"
        // Structural: the drawer is the provider's mobile width.
        style={{ width: widthMobile }}
      >
        {children}
      </Sheet.Content>
    </Sheet>
  )
}

// ─── Sidebar ─────────────────────────────────────────────────────────────────

interface SidebarProps
  extends Omit<
    HTMLAttributes<HTMLDivElement>,
    | 'defaultValue'
    | 'onDrag'
    | 'onDragStart'
    | 'onDragEnd'
    | 'onAnimationStart'
    | 'onAnimationEnd'
    | 'onAnimationIteration'
  > {
  /** The edge it sits on; the shortcut key and the rail mirror it. Defaults to `'left'`. */
  side?: 'left' | 'right'
  /** `'sidebar'` sits flush with an inner border, `'floating'` lifts it onto its own card one surface level up, `'inset'` makes the main region the card. Defaults to `'sidebar'`. */
  variant?: 'sidebar' | 'floating' | 'inset'
  /** `'offcanvas'` collapses it away (rail, trigger, shortcut, peek, mobile drawer); `'none'` pins it open, with no rail or drawer — for a sidebar inside a dialog. Defaults to `'offcanvas'`. */
  collapsible?: 'offcanvas' | 'none'
  /** The `sidebar` variant's inner-edge border. Defaults to `true`. */
  bordered?: boolean
  /** Render the built-in resize/collapse rail on the inner edge. Defaults to `true`. */
  rail?: boolean
  /** Pin the rail's tooltip open (`true`) or closed (`false`); left out, it shows on hover. Dragging always hides it. */
  railTooltipOpen?: boolean
  /** Controlled selection: the menu button or sub-button whose `value` matches is the active row. */
  value?: string
  /** Initial selection, for an uncontrolled sidebar. */
  defaultValue?: string
  /** Called with the `value` of the row that was pressed. */
  onValueChange?: (value: string) => void
  /** Extra classes for the sidebar column (`h-full` pins it to a bounded frame). */
  className?: string
  /** The sidebar's parts: `Sidebar.Header`, `Sidebar.Content`, `Sidebar.Footer`. */
  children?: ReactNode
}

type SidebarComponent = ForwardRefExoticComponent<SidebarProps & RefAttributes<HTMLDivElement>> & {
  Provider: typeof SidebarProvider
  Trigger: typeof SidebarTrigger
  Rail: typeof SidebarRail
  Inset: typeof SidebarInset
  Input: typeof SidebarInput
  Header: typeof SidebarHeader
  Content: typeof SidebarContent
  Footer: typeof SidebarFooter
  Separator: typeof SidebarSeparator
  Group: typeof SidebarGroup
  GroupLabel: typeof SidebarGroupLabel
  GroupAction: typeof SidebarGroupAction
  GroupActions: typeof SidebarGroupActions
  GroupContent: typeof SidebarGroupContent
  Menu: typeof SidebarMenu
  MenuItem: typeof SidebarMenuItem
  MenuButton: typeof SidebarMenuButton
  MenuAction: typeof SidebarMenuAction
  MenuActions: typeof SidebarMenuActions
  MenuBadge: typeof SidebarMenuBadge
  MenuSkeleton: typeof SidebarMenuSkeleton
  MenuSub: typeof SidebarMenuSub
  MenuSubItem: typeof SidebarMenuSubItem
  MenuSubButton: typeof SidebarMenuSubButton
}

/**
 * A sidebar built from composable parts. Drag its edge to resize, collapse it
 * away, and on mobile it becomes a drawer.
 *
 * Everything that moves here moves in the morph style (see Morph). The
 * active row and the hover highlight are liquid: a new selection melts
 * across from the old one, and the highlight drips from row to row, into a
 * row's sub-menu too. Collapsed, the sidebar peeks out of the edge strip, or
 * out of the trigger it was hovered from, with the goo neck, and melts back
 * into it. On mobile it is a `Sheet` growing out of its edge that you swipe
 * away. The menus in the header, the footer and on each row are Dropdowns,
 * and the tooltips are Tooltips, so they grow out of their triggers too.
 *
 * Wrap the page in `Sidebar.Provider`, then put the `Sidebar` and a
 * `Sidebar.Inset` (the main region) inside it. The provider holds the open
 * state (`open` / `defaultOpen` / `onOpenChange`, kept in the `sidebar_state`
 * cookie unless `persist={false}`), the `width` and `widthMobile`, the
 * `mobileBreakpoint` under which it becomes a drawer, the `peek` mode
 * (`'hover'` or `'click'`: the collapsed sidebar floats out from its edge
 * without pinning) and the bare `shortcut` key (`[` for a left sidebar,
 * `]` for a right one; `null` turns it off). It fills the viewport; pass
 * `className="h-full min-h-0"` to fill a bounded frame instead.
 *
 * Drag the rail on the inner edge to resize the sidebar (160–360px); throw
 * it at the edge to collapse, or click it. There is no icon-only rail on
 * purpose: a collapsed sidebar peeks out whole instead.
 *
 * ## Rows
 *
 * - Two levels: `Sidebar.MenuButton` rows, each folding a
 *   `Sidebar.MenuSub` of `Sidebar.MenuSubButton` rows. A
 *   `Sidebar.MenuItem collapsible` toggles its sub-menu from its own button
 *   and draws the chevron.
 * - Give a button a `value` and the sidebar's `value` / `defaultValue` picks
 *   the active row; pressing a row selects it. `isActive` still forces a row
 *   active.
 * - `icon` puts a glyph in the leading slot; `status` (`'active'`,
 *   `'unread'`, `'idle'`) a thread's dot instead.
 * - `Sidebar.MenuBadge` keeps the rightmost slot; up to three
 *   `Sidebar.MenuAction`s (in a `Sidebar.MenuActions` cluster) sit beside
 *   it, `showOnHover` so the label keeps the room at rest.
 * - The rows share one fluid hover, one keyboard roving focus (arrows,
 *   Home, End) and one focus ring across both levels.
 *
 * ## Sections
 *
 * `Sidebar.Group` with a `Sidebar.GroupLabel` is a section; `collapsible`
 * makes the label fold everything under it. `Sidebar.GroupActions` holds
 * its `Sidebar.GroupAction` buttons over the label's right edge.
 *
 * Statics:
 * - `Sidebar.Provider`, `Sidebar.Inset`, `Sidebar.Trigger` (the ghost icon
 *   button with the shortcut in its tooltip), `Sidebar.Rail`.
 * - `Sidebar.Header`, `Sidebar.Content` (the scrolling region),
 *   `Sidebar.Footer`, `Sidebar.Separator`, `Sidebar.Input`.
 * - `Sidebar.Group`, `Sidebar.GroupLabel`, `Sidebar.GroupAction`,
 *   `Sidebar.GroupActions`, `Sidebar.GroupContent`.
 * - `Sidebar.Menu`, `Sidebar.MenuItem`, `Sidebar.MenuButton`,
 *   `Sidebar.MenuAction`, `Sidebar.MenuActions`, `Sidebar.MenuBadge`,
 *   `Sidebar.MenuSkeleton`, `Sidebar.MenuSub`, `Sidebar.MenuSubItem`,
 *   `Sidebar.MenuSubButton`.
 * - `useSidebar()` (named export) reads the provider's state.
 *
 * @example {@include ./examples.mdx}
 */
const Sidebar = forwardRef<HTMLDivElement, SidebarProps>(
  (
    {
      side = 'left',
      variant = 'sidebar',
      collapsible = 'offcanvas',
      bordered = true,
      rail = true,
      railTooltipOpen,
      value: valueProp,
      defaultValue,
      onValueChange,
      className,
      style,
      children: parts,
      ...props
    },
    ref,
  ) => {
    const { isMobile, width, registerSide } = useSidebar()
    const [value, setValue] = useControllableState<string | undefined>(
      valueProp,
      defaultValue,
      onValueChange as ((value: string | undefined) => void) | undefined,
    )
    const selection = useMemo(() => ({ value, select: (next: string) => setValue(next) }), [value, setValue])
    const children = <SidebarSelection.Provider value={selection}>{parts}</SidebarSelection.Provider>

    // The provider mirrors the side into the default shortcut ("[" / "]")
    // and the rail handle.
    useEffect(() => registerSide(side), [side, registerSide])

    if (collapsible === 'none') {
      return (
        <div
          ref={ref}
          data-slot="sidebar"
          data-variant={variant}
          data-side={side}
          className={cn('peer sticky top-0 flex h-svh shrink-0 flex-col', side === 'right' && 'order-last', className)}
          style={{ width, ...style } as CSSProperties}
          {...props}
        >
          <div
            data-sidebar="sidebar"
            className={cn(
              'flex h-full w-full min-h-0 flex-col',
              bordered &&
                variant === 'sidebar' &&
                (side === 'left' ? 'border-r border-border' : 'border-l border-border'),
            )}
          >
            {children}
          </div>
        </div>
      )
    }

    // The desktop shell stays MOUNTED across the drawer breakpoint — its
    // breakpoint classes fade it out (opacity + display, allow-discrete)
    // instead of this component unmounting it, which snapped the rail away
    // the instant the window shrank. The sheet mounts alongside it below the
    // breakpoint; the hidden shell costs nothing visible (display: none).
    return (
      <>
        {isMobile && <SidebarSheet side={side}>{children}</SidebarSheet>}
        <SidebarShell
          ref={ref}
          side={side}
          variant={variant}
          bordered={bordered}
          rail={rail}
          railTooltipOpen={railTooltipOpen}
          className={className}
          style={style}
          {...props}
        >
          {children}
        </SidebarShell>
      </>
    )
  },
) as SidebarComponent
Sidebar.displayName = 'Sidebar'

// ─── SidebarContent ──────────────────────────────────────────────────────────

export interface SidebarContentProps extends HTMLAttributes<HTMLDivElement> {
  viewportClassName?: string
}

const SidebarContent = forwardRef<HTMLDivElement, SidebarContentProps>(
  ({ className, viewportClassName, children, ...props }, ref) => {
    const { isMobile } = useSidebar()

    // Inside the mobile sheet, the sheet's flex column owns layout and this
    // region scrolls natively — a nested ScrollArea would double-scroll. The
    // boundary hairline still needs a frame to ride: scroll-divider can't sit
    // on the scroller itself (its own fade mask would erase the line), so the
    // region is wrapped the way ScrollArea wraps its viewport on desktop.
    if (isMobile) {
      return (
        <div className="scroll-divider [--scroll-divider-inset:8px] flex min-h-0 w-full flex-1 flex-col">
          <div
            ref={ref}
            data-sidebar="content"
            className={cn('scroll-fade flex min-h-0 w-full flex-1 flex-col overflow-y-auto', className)}
            {...props}
          >
            {children}
          </div>
        </div>
      )
    }

    // The scroll primitive wraps children in an inline-styled sizer that
    // sizes to content — rows would stop shrinking near the min width
    // instead of truncating, so the viewport's direct child is forced back
    // to a plain shrinkable block.
    return (
      <ScrollArea
        className={cn('scroll-divider min-h-0 w-full flex-1', className)}
        viewportClassName={cn('scroll-fade [&>div]:!block [&>div]:!min-w-0', viewportClassName)}
      >
        <div ref={ref} data-sidebar="content" className="flex w-full min-w-0 flex-col" {...props}>
          {children}
        </div>
      </ScrollArea>
    )
  },
)
SidebarContent.displayName = 'SidebarContent'

// Compound statics: `<Sidebar.Provider>`, `<Sidebar.Menu>`, … (typed by the
// SidebarComponent cast on the forwardRef above).
Object.assign(Sidebar, {
  Provider: SidebarProvider,
  Trigger: SidebarTrigger,
  Rail: SidebarRail,
  Inset: SidebarInset,
  Input: SidebarInput,
  Header: SidebarHeader,
  Content: SidebarContent,
  Footer: SidebarFooter,
  Separator: SidebarSeparator,
  Group: SidebarGroup,
  GroupLabel: SidebarGroupLabel,
  GroupAction: SidebarGroupAction,
  GroupActions: SidebarGroupActions,
  GroupContent: SidebarGroupContent,
  Menu: SidebarMenu,
  MenuItem: SidebarMenuItem,
  MenuButton: SidebarMenuButton,
  MenuAction: SidebarMenuAction,
  MenuActions: SidebarMenuActions,
  MenuBadge: SidebarMenuBadge,
  MenuSkeleton: SidebarMenuSkeleton,
  MenuSub: SidebarMenuSub,
  MenuSubItem: SidebarMenuSubItem,
  MenuSubButton: SidebarMenuSubButton,
})

export type {
  SidebarCollapsible,
  SidebarContextValue,
  SidebarGroupActionProps,
  SidebarGroupLabelProps,
  SidebarInputProps,
  SidebarInsetProps,
  SidebarProviderProps,
  SidebarRailProps,
  SidebarSectionProps,
  SidebarSide,
  SidebarTriggerProps,
  SidebarVariant,
} from './sidebar-core'
// Re-export the flavor-neutral parts so `sidebar` is a one-stop import.
export {
  SIDEBAR_COOKIE_MAX_AGE,
  SIDEBAR_COOKIE_NAME,
  SIDEBAR_KEYBOARD_SHORTCUT,
  SIDEBAR_KEYBOARD_SHORTCUT_RIGHT,
  SIDEBAR_MAX_WIDTH,
  SIDEBAR_MIN_WIDTH,
  SIDEBAR_WIDTH,
  SIDEBAR_WIDTH_MOBILE,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupActions,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarInset,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
} from './sidebar-core'
export type {
  SidebarMenuActionProps,
  SidebarMenuBadgeProps,
  SidebarMenuButtonProps,
  SidebarMenuItemProps,
  SidebarMenuProps,
  SidebarMenuSkeletonProps,
  SidebarMenuSubButtonProps,
  SidebarMenuSubItemProps,
  SidebarMenuSubProps,
  SidebarSelectionValue,
} from './sidebar-menu'
export {
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuActions,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarSelection,
  sidebarMenuButtonVariants,
} from './sidebar-menu'
export type { SidebarProps }
export { Sidebar, SidebarContent }

export default Sidebar
