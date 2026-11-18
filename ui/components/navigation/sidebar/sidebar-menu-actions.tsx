/*!
 * Ported from Fluid Functionalism — github.com/mickadesign/fluid-functionalism
 * `registry/default/sidebar-menu.tsx` @ b3587bdbd83fc66c2a6aae3817ffb856cb09260b
 * MIT License © 2026 Micka Touillaud — fluidfunctionalism.com (notice: LICENSE.fluid-functionalism)
 * Local changes: see PORTING.md.
 */

'use client'

import {
  type ButtonHTMLAttributes,
  Children,
  type CSSProperties,
  forwardRef,
  type HTMLAttributes,
  type MouseEvent,
  type ReactElement,
  type Ref,
  useContext,
  useId,
} from 'react'
import { useShape } from '../../../lib/shape-context'
import { useSize } from '../../../lib/size-context'
import { resolveSlotTemplate, slotElement } from '../../../lib/slot'
import { useIsoLayoutEffect } from '../../../lib/use-iso-layout-effect'
import { cn } from '../../../lib/utils'
import { MenuActionsClusterContext, MenuRowContext, useRowState } from './menu-scope'

export interface SidebarMenuActionProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Hidden until the row is hovered or focused, so the label keeps the room at rest. Defaults to `false`. */
  showOnHover?: boolean
  /** Render this element instead of a `<button>`. */
  render?: ReactElement
  /** `render` spelled as the single child element. */
  asChild?: boolean
}

const SidebarMenuAction = forwardRef<HTMLButtonElement, SidebarMenuActionProps>(
  ({ className, showOnHover = false, render, asChild, children, onClick, style, ...props }, ref) => {
    const shape = useShape()
    const size = useSize()
    const item = useContext(MenuRowContext)
    const inCluster = useContext(MenuActionsClusterContext)
    const { template, content } = resolveSlotTemplate(render, asChild, children)

    // A lone action registers its slot; in a cluster the wrapper registers the count.
    const setActions = item?.setActions
    useIsoLayoutEffect(() => {
      if (inCluster || !setActions) return
      setActions(1, showOnHover)
      return () => setActions(0, false)
    }, [inCluster, setActions, showOnHover])

    return slotElement(
      template,
      'button',
      {
        ref: ref as Ref<HTMLElement>,
        type: template ? undefined : 'button',
        'data-sidebar': 'menu-action',
        'data-show-on-hover': showOnHover ? '' : undefined,
        className: cn(
          'flex size-6 items-center justify-center text-muted-foreground outline-none',
          // right-1.5 puts the 24px box on the badge's axis, 18px from the
          // row's edge; beside a badge the action moves left of it.
          inCluster ? 'relative shrink-0' : 'absolute right-1.5 z-10',
          !inCluster &&
            (item?.isSubRow
              ? 'group-has-[>[data-sidebar=menu-badge]]/menu-sub-item:right-8.5'
              : 'group-has-[>[data-sidebar=menu-badge]]/menu-item:right-8.5'),
          !inCluster && (item?.isSubRow || size.variant === 'compact' ? 'top-0.5' : 'top-1'),
          'hover:bg-hover hover:text-foreground transition-[color,background-color,opacity] duration-fast',
          'focus-visible:ring-1 focus-visible:ring-focus-ring',
          // Bare icons at the leading icons' size and a 1.5 stroke, 2 on hover.
          '[&_svg]:size-[var(--icon-size)] [&_svg]:shrink-0 [&_svg]:stroke-[1.5] [&_svg]:transition-[stroke-width] [&_svg]:duration-fast hover:[&_svg]:stroke-[2]',
          shape.item,
          // Reveal on the own row only: a sub action's nearest menu-item group
          // is the parent `<li>`, and a parent row's `<li>` also wraps its
          // sub-menu, so the parent tracks its button (its peer).
          !inCluster &&
            showOnHover &&
            (item?.isSubRow
              ? 'opacity-0 group-hover/menu-sub-item:opacity-100 group-focus-within/menu-sub-item:opacity-100 data-[popup-open]:opacity-100 aria-expanded:opacity-100'
              : 'opacity-0 peer-hover/menu-button:opacity-100 peer-focus-visible/menu-button:opacity-100 hover:opacity-100 focus-visible:opacity-100 data-[popup-open]:opacity-100 aria-expanded:opacity-100'),
          className,
        ),
        onClick: (event: MouseEvent<HTMLButtonElement>) => {
          // On a row composed through `render`, the click must not also trigger the row.
          event.stopPropagation()
          onClick?.(event)
        },
        ...props,
        style: { '--icon-size': `${size.icon}px`, ...style } as CSSProperties,
      },
      content,
    )
  },
)
SidebarMenuAction.displayName = 'SidebarMenuAction'

export interface SidebarMenuActionsProps extends HTMLAttributes<HTMLDivElement> {
  /** Hide the cluster until the row is hovered or focused. Defaults to `false`. */
  showOnHover?: boolean
}

/** A row's cluster of `SidebarMenuAction`s: it positions them and reports the count, so the button reserves the exact gutter. */
const SidebarMenuActions = forwardRef<HTMLDivElement, SidebarMenuActionsProps>(
  ({ className, showOnHover = false, children, ...props }, ref) => {
    const item = useContext(MenuRowContext)
    const size = useSize()
    const count = Children.count(children)

    const setActions = item?.setActions
    useIsoLayoutEffect(() => {
      setActions?.(count, showOnHover)
      return () => setActions?.(0, false)
    }, [setActions, count, showOnHover])

    return (
      <div
        ref={ref}
        data-sidebar="menu-actions"
        className={cn(
          'absolute right-1.5 z-10 flex items-center gap-1',
          item?.isSubRow
            ? 'group-has-[>[data-sidebar=menu-badge]]/menu-sub-item:right-8.5'
            : 'group-has-[>[data-sidebar=menu-badge]]/menu-item:right-8.5',
          item?.isSubRow || size.variant === 'compact' ? 'top-0.5' : 'top-1',
          showOnHover &&
            (item?.isSubRow
              ? 'opacity-0 transition-opacity duration-fast group-hover/menu-sub-item:opacity-100 group-focus-within/menu-sub-item:opacity-100 has-[[data-popup-open]]:opacity-100'
              : 'opacity-0 transition-opacity duration-fast peer-hover/menu-button:opacity-100 peer-focus-visible/menu-button:opacity-100 hover:opacity-100 focus-within:opacity-100 has-[[data-popup-open]]:opacity-100'),
          className,
        )}
        {...props}
      >
        <MenuActionsClusterContext.Provider value={true}>{children}</MenuActionsClusterContext.Provider>
      </div>
    )
  },
)
SidebarMenuActions.displayName = 'SidebarMenuActions'

export type SidebarMenuBadgeProps = HTMLAttributes<HTMLDivElement>

const SidebarMenuBadge = forwardRef<HTMLDivElement, SidebarMenuBadgeProps>(({ className, ...props }, ref) => {
  const item = useContext(MenuRowContext)
  const size = useSize()
  const lit = useRowState(item?.rowRef).isActiveRow

  const setHasBadge = item?.setHasBadge
  useIsoLayoutEffect(() => {
    setHasBadge?.(true)
    return () => setHasBadge?.(false)
  }, [setHasBadge])

  return (
    <div
      ref={ref}
      data-sidebar="menu-badge"
      className={cn(
        'pointer-events-none absolute right-2 z-10 flex h-5 min-w-5 items-center justify-center px-1 tabular-nums',
        size.variant === 'compact' ? 'top-1 text-micro-compact' : 'top-1.5 text-micro',
        'transition-[color,font-variation-settings] duration-fast',
        lit ? 'text-foreground weight-semibold' : 'text-muted-foreground weight-normal',
        className,
      )}
      {...props}
    />
  )
})
SidebarMenuBadge.displayName = 'SidebarMenuBadge'

export interface SidebarMenuSkeletonProps extends HTMLAttributes<HTMLDivElement> {
  /** A placeholder for the leading icon. Defaults to `false`. */
  showIcon?: boolean
}

// A width cycle keyed on the id, not Math.random: server and client render the same markup.
const SKELETON_WIDTHS = ['62%', '74%', '55%', '82%', '68%']

const SidebarMenuSkeleton = forwardRef<HTMLDivElement, SidebarMenuSkeletonProps>(
  ({ className, showIcon = false, ...props }, ref) => {
    const size = useSize()
    const id = useId()
    let sum = 0
    for (let i = 0; i < id.length; i++) sum += id.charCodeAt(i)
    return (
      <div
        ref={ref}
        data-sidebar="menu-skeleton"
        className={cn('flex items-center gap-2 px-2', size.variant === 'compact' ? 'h-7' : 'h-8', className)}
        {...props}
      >
        {showIcon && (
          <div data-sidebar="menu-skeleton-icon" className="size-4 shrink-0 animate-pulse rounded-md bg-hover" />
        )}
        <div
          data-sidebar="menu-skeleton-text"
          className="h-4 flex-1 animate-pulse rounded-md bg-hover"
          style={{ maxWidth: SKELETON_WIDTHS[sum % SKELETON_WIDTHS.length] }}
        />
      </div>
    )
  },
)
SidebarMenuSkeleton.displayName = 'SidebarMenuSkeleton'

export { SidebarMenuAction, SidebarMenuActions, SidebarMenuBadge, SidebarMenuSkeleton }
