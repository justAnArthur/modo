/*!
 * Ported from Fluid Functionalism — github.com/mickadesign/fluid-functionalism
 * `registry/default/sidebar-menu.tsx` @ b3587bdbd83fc66c2a6aae3817ffb856cb09260b
 * MIT License © 2026 Micka Touillaud — fluidfunctionalism.com (notice: LICENSE.fluid-functionalism)
 * Local changes: see PORTING.md.
 */

'use client'

import {
  forwardRef,
  type HTMLAttributes,
  type LiHTMLAttributes,
  type MutableRefObject,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useMergeRefs } from '../../../lib/merge-refs'
import type { SizeVariant } from '../../../lib/size-context'
import { useControllableState } from '../../../lib/use-controllable-state'
import { useIsoLayoutEffect } from '../../../lib/use-iso-layout-effect'
import { cn } from '../../../lib/utils'
import { SizeScope } from '../../../primitives/systems/sizes'
import {
  MenuItemContext,
  type MenuItemContextValue,
  MenuRowContext,
  type MenuRowContextValue,
  MenuScopeContext,
  useMenuScope,
} from './menu-scope'

export interface SidebarMenuProps extends HTMLAttributes<HTMLUListElement> {
  /** Pins the menu's rows to one step of the size ladder. Omitted, they follow the surrounding SizeProvider. */
  size?: SizeVariant
  /** Draw the travelling keyboard focus ring. Off, keyboard focus moves the hover background only. Defaults to `true`. */
  focusRing?: boolean
}

const SidebarMenu = forwardRef<HTMLUListElement, SidebarMenuProps>(
  ({ className, size, focusRing, children, ...props }, ref) => {
    const containerRef = useRef<HTMLUListElement | null>(null)
    const { value, containerProps, overlays } = useMenuScope(containerRef, { focusRing })
    const list = useMergeRefs(containerRef, ref)

    return (
      <SizeScope size={size}>
        <MenuScopeContext.Provider value={value}>
          <ul
            ref={list}
            data-sidebar="menu"
            className={cn('relative flex w-full min-w-0 flex-col select-none', className)}
            {...containerProps}
            {...props}
          >
            {overlays}
            {children}
          </ul>
        </MenuScopeContext.Provider>
      </SizeScope>
    )
  },
)
SidebarMenu.displayName = 'SidebarMenu'

export interface SidebarMenuItemProps extends LiHTMLAttributes<HTMLLIElement> {
  /** The row folds a `SidebarMenuSub` under it: its button toggles the sub-menu and shows a chevron. */
  collapsible?: boolean
  /** Controlled open state of a collapsible row's sub-menu. */
  open?: boolean
  /** Initial open state of a collapsible row's sub-menu. */
  defaultOpen?: boolean
  /** Called when a collapsible row opens or closes. */
  onOpenChange?: (open: boolean) => void
}

function useMenuRow(
  rowRef: MutableRefObject<HTMLLIElement | null>,
  isSubRow: boolean,
  sub?: Pick<SidebarMenuItemProps, 'collapsible' | 'open' | 'defaultOpen' | 'onOpenChange'>,
): { item: MenuItemContextValue; row: MenuRowContextValue } {
  const scope = useContext(MenuScopeContext)
  const registerRow = scope?.registerRow
  const setRowButton = scope?.setRowButton
  const setRowActive = scope?.setRowActive

  // The button's setActive can fire while the `<li>` ref is detached (a
  // child's layout effects run before its parent's ref attaches, at mount and
  // on every re-render whose ref identity changes). The flag holds the truth
  // through that window and attachRow replays it.
  const activeFlagRef = useRef(false)

  useIsoLayoutEffect(() => {
    const el = rowRef.current
    if (!el || !registerRow) return
    return registerRow(el)
  }, [registerRow, rowRef])

  const attachRow = useCallback(
    (node: HTMLLIElement | null) => {
      rowRef.current = node
      if (node && setRowActive) setRowActive(node, activeFlagRef.current)
    },
    [setRowActive, rowRef],
  )

  const setActive = useCallback(
    (active: boolean) => {
      activeFlagRef.current = active
      if (rowRef.current && setRowActive) setRowActive(rowRef.current, active)
    },
    [setRowActive, rowRef],
  )

  const setButtonEl = useCallback(
    (el: HTMLElement | null) => {
      if (rowRef.current && setRowButton) setRowButton(rowRef.current, el)
    },
    [setRowButton, rowRef],
  )

  const [trailing, setTrailing] = useState({ actionCount: 0, actionsShowOnHover: false, hasBadge: false })
  const setActions = useCallback(
    (count: number, showOnHover: boolean) =>
      setTrailing(prev =>
        prev.actionCount === count && prev.actionsShowOnHover === showOnHover
          ? prev
          : { ...prev, actionCount: count, actionsShowOnHover: showOnHover },
      ),
    [],
  )
  const setHasBadge = useCallback(
    (hasBadge: boolean) => setTrailing(prev => (prev.hasBadge === hasBadge ? prev : { ...prev, hasBadge })),
    [],
  )

  const [open, setOpen] = useControllableState(sub?.open, sub?.defaultOpen ?? false, sub?.onOpenChange)
  const subOpen = sub?.collapsible ? open : undefined
  const toggleSub = useCallback(() => setOpen(prev => !prev), [setOpen])

  const row = useMemo(
    () => ({ rowRef, isSubRow, setActions, setHasBadge }),
    [rowRef, isSubRow, setActions, setHasBadge],
  )
  const item = useMemo(
    () => ({
      rowRef,
      attachRow,
      isSubRow,
      setActive,
      setButtonEl,
      ...trailing,
      setActions,
      setHasBadge,
      subOpen,
      toggleSub,
    }),
    [rowRef, attachRow, isSubRow, setActive, setButtonEl, trailing, setActions, setHasBadge, subOpen, toggleSub],
  )
  return { item, row }
}

const SidebarMenuItem = forwardRef<HTMLLIElement, SidebarMenuItemProps>(
  ({ collapsible, open, defaultOpen, onOpenChange, className, children, ...props }, ref) => {
    const rowRef = useRef<HTMLLIElement | null>(null)
    const { item, row } = useMenuRow(rowRef, false, { collapsible, open, defaultOpen, onOpenChange })
    // Stable: an inline ref is detached around every re-render, and child layout effects fire in that window.
    const attach = useMergeRefs(item.attachRow, ref)
    return (
      <MenuRowContext.Provider value={row}>
        <MenuItemContext.Provider value={item}>
          <li ref={attach} data-sidebar="menu-item" className={cn('group/menu-item relative', className)} {...props}>
            {children}
          </li>
        </MenuItemContext.Provider>
      </MenuRowContext.Provider>
    )
  },
)
SidebarMenuItem.displayName = 'SidebarMenuItem'

export type SidebarMenuSubItemProps = LiHTMLAttributes<HTMLLIElement>

const SidebarMenuSubItem = forwardRef<HTMLLIElement, SidebarMenuSubItemProps>(
  ({ className, children, ...props }, ref) => {
    const rowRef = useRef<HTMLLIElement | null>(null)
    const { item, row } = useMenuRow(rowRef, true)
    const attach = useMergeRefs(item.attachRow, ref)
    return (
      <MenuRowContext.Provider value={row}>
        <MenuItemContext.Provider value={item}>
          <li
            ref={attach}
            data-sidebar="menu-sub-item"
            className={cn('group/menu-sub-item relative', className)}
            {...props}
          >
            {children}
          </li>
        </MenuItemContext.Provider>
      </MenuRowContext.Provider>
    )
  },
)
SidebarMenuSubItem.displayName = 'SidebarMenuSubItem'

export { SidebarMenu, SidebarMenuItem, SidebarMenuSubItem }
