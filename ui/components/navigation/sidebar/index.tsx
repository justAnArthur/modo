/*!
 * Ported from Fluid Functionalism — github.com/mickadesign/fluid-functionalism
 * `registry/base/sidebar.tsx` @ b3587bdbd83fc66c2a6aae3817ffb856cb09260b
 * MIT License © 2026 Micka Touillaud — fluidfunctionalism.com (notice: LICENSE.fluid-functionalism)
 * Local changes: see PORTING.md.
 */

'use client'

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
import { useControllableState } from '../../../lib/use-controllable-state'
import { cn } from '../../../lib/utils'
import { ScrollArea } from '../../../primitives/scroll-area'
import { Sheet } from '../../overlays/sheet'
import { SidebarSelection } from './menu-scope'
import { type SidebarSide, useSidebar } from './sidebar-context'
import {
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupActions,
  SidebarGroupContent,
  SidebarGroupLabel,
} from './sidebar-group'
import { SidebarMenuAction, SidebarMenuActions, SidebarMenuBadge, SidebarMenuSkeleton } from './sidebar-menu-actions'
import { SidebarMenuButton } from './sidebar-menu-button'
import { SidebarMenu, SidebarMenuItem, SidebarMenuSubItem } from './sidebar-menu-item'
import { SidebarMenuSub, SidebarMenuSubButton } from './sidebar-menu-sub'
import { SidebarFooter, SidebarHeader, SidebarInput, SidebarInset, SidebarSeparator } from './sidebar-parts'
import { SidebarProvider } from './sidebar-provider'
import { SidebarRail, SidebarTrigger } from './sidebar-rail'
import { SidebarShell } from './sidebar-shell'

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
        style={{ width: widthMobile }}
      >
        {children}
      </Sheet.Content>
    </Sheet>
  )
}

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
  /** `'offcanvas'` collapses it away (rail, trigger, shortcut, open on hover, mobile drawer); `'none'` pins it open, with no rail or drawer — for a sidebar inside a dialog. Defaults to `'offcanvas'`. */
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
 * row's sub-menu too. On mobile it is a `Sheet` growing out of its edge
 * that you swipe away. The menus in the header, the footer and on each row
 * are Dropdowns, and the tooltips are Tooltips, so they grow out of their
 * triggers too.
 *
 * Wrap the page in `Sidebar.Provider`, then put the `Sidebar` and a
 * `Sidebar.Inset` (the main region) inside it. The provider holds the open
 * state (`open` / `defaultOpen` / `onOpenChange`, kept in the `sidebar_state`
 * cookie unless `persist={false}`), the `width` and `widthMobile`, the
 * `mobileBreakpoint` under which it becomes a drawer, `openOnHover` (below)
 * and the bare `shortcut` key (`[` for a left sidebar, `]` for a right one;
 * `null` turns it off). With focus inside nested providers the innermost
 * answers; with focus on the page, a `shortcutScope="page"` provider wins
 * over others with the same key. It fills the viewport; pass
 * `className="h-full min-h-0"` to fill a bounded frame instead.
 *
 * Drag the rail on the inner edge to resize the sidebar (160–360px); throw
 * it at the edge to collapse, or click it. There is no icon-only rail on
 * purpose: a collapsed sidebar opens whole on hover instead.
 *
 * With `openOnHover`, collapsing leaves the sidebar on hover: it opens, in
 * flow, while the pointer is between its edge and the far side of a
 * `Sidebar.Trigger` beside it (or a thin strip at the edge), and closes a
 * beat after the pointer leaves. `open` is then whether it is kept open: the
 * trigger switches between the two and draws a dashed glyph while on hover,
 * and the rail collapses or resizes the hover without keeping it open.
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
 * @source https://github.com/mickadesign/fluid-functionalism/blob/b3587bdbd83fc66c2a6aae3817ffb856cb09260b/registry/base/sidebar.tsx Fluid Functionalism
 * @license MIT © 2026 Micka Touillaud
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
    const [value, setValue] = useControllableState(valueProp, defaultValue, onValueChange)
    const selection = useMemo(() => ({ value, select: setValue }), [value, setValue])
    const children = <SidebarSelection.Provider value={selection}>{parts}</SidebarSelection.Provider>

    // The provider mirrors the side into the default shortcut and the rail.
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

    // The shell stays mounted across the drawer breakpoint, so its classes
    // can fade it out; the sheet mounts beside it below the breakpoint.
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

export interface SidebarContentProps extends HTMLAttributes<HTMLDivElement> {
  viewportClassName?: string
}

const SidebarContent = forwardRef<HTMLDivElement, SidebarContentProps>(
  ({ className, viewportClassName, children, ...props }, ref) => {
    const { isMobile } = useSidebar()

    // In the sheet this region scrolls natively (a ScrollArea would
    // double-scroll). The hairline can't sit on the scroller, whose fade mask
    // would erase it, so the region is wrapped as ScrollArea wraps its viewport.
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

    // ScrollArea's content sizer would stop rows shrinking near the min width
    // instead of truncating: it is forced back to a plain block.
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

export type { SidebarSelectionValue } from './menu-scope'
export { SidebarSelection } from './menu-scope'
export type { SidebarCollapsible, SidebarContextValue, SidebarSide, SidebarVariant } from './sidebar-context'
export {
  SIDEBAR_COOKIE_MAX_AGE,
  SIDEBAR_COOKIE_NAME,
  SIDEBAR_KEYBOARD_SHORTCUT,
  SIDEBAR_KEYBOARD_SHORTCUT_RIGHT,
  SIDEBAR_MAX_WIDTH,
  SIDEBAR_MIN_WIDTH,
  SIDEBAR_WIDTH,
  SIDEBAR_WIDTH_MOBILE,
  useSidebar,
} from './sidebar-context'
export type {
  SidebarGroupActionProps,
  SidebarGroupActionsProps,
  SidebarGroupLabelProps,
  SidebarGroupProps,
} from './sidebar-group'
export {
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupActions,
  SidebarGroupContent,
  SidebarGroupLabel,
} from './sidebar-group'
export type {
  SidebarMenuActionProps,
  SidebarMenuActionsProps,
  SidebarMenuBadgeProps,
  SidebarMenuSkeletonProps,
} from './sidebar-menu-actions'
export { SidebarMenuAction, SidebarMenuActions, SidebarMenuBadge, SidebarMenuSkeleton } from './sidebar-menu-actions'
export type { SidebarMenuButtonProps } from './sidebar-menu-button'
export { SidebarMenuButton, sidebarMenuButtonVariants } from './sidebar-menu-button'
export type { SidebarMenuItemProps, SidebarMenuProps, SidebarMenuSubItemProps } from './sidebar-menu-item'
export { SidebarMenu, SidebarMenuItem, SidebarMenuSubItem } from './sidebar-menu-item'
export type { SidebarMenuSubButtonProps, SidebarMenuSubProps } from './sidebar-menu-sub'
export { SidebarMenuSub, SidebarMenuSubButton } from './sidebar-menu-sub'
export type { SidebarInputProps, SidebarInsetProps, SidebarSectionProps } from './sidebar-parts'
export { SidebarFooter, SidebarHeader, SidebarInput, SidebarInset, SidebarSeparator } from './sidebar-parts'
export type { SidebarProviderProps } from './sidebar-provider'
export { SidebarProvider } from './sidebar-provider'
export type { SidebarRailProps, SidebarTriggerProps } from './sidebar-rail'
export { SidebarRail, SidebarTrigger } from './sidebar-rail'
export type { SidebarShortcutScope } from './sidebar-shortcut'
export type { SidebarProps }
export { Sidebar, SidebarContent }

export default Sidebar
