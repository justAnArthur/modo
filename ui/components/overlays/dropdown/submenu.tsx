/*
 * Local addition (not part of Fluid Functionalism): Dropdown's submenus, on
 * Base UI's `Menu.SubmenuRoot` / `Menu.SubmenuTrigger`. The trigger is a
 * `MenuItem` with a trailing chevron; the panel is the shared `MenuPopup`, so
 * it has the same rows, selection, fluid hover and morph as `Dropdown.Content`.
 */

'use client'

import { Menu, type MenuRootChangeEventDetails } from '@base-ui/react/menu'
import { forwardRef, type HTMLAttributes, type ReactNode, useMemo } from 'react'
import { useIcon } from '../../../lib/icon-context'
import { type AnchorProps, OverlayContext, positionerProps, useOverlay, useOverlayRoot } from '../../../lib/overlay'
import { useSize } from '../../../lib/size-context'
import type { MorphProps } from '../../../lib/use-morph'
import { cn } from '../../../lib/utils'
import { DropdownContext, type DropdownContextValue, type MenuItemProps, MenuRow, useDropdown } from './menu-item'
import { type MenuFocusProps, MenuPopup } from './menu-popup'
import type { PanelSelectionProps } from './panel-state'

interface DropdownSubProps {
  /** `Dropdown.SubTrigger` and `Dropdown.SubContent`. */
  children: ReactNode
  /** Controlled open state. Pair with `onOpenChange`. */
  open?: boolean
  /** Initial open state, uncontrolled. Defaults to `false`. */
  defaultOpen?: boolean
  /** Called when the submenu opens or closes, with Base UI's change details: `reason`, the `event`, and `cancel()` to keep it as it is. */
  onOpenChange?: (open: boolean, details: MenuRootChangeEventDetails) => void
  /** Disables the submenu: its trigger row dims and never opens it. Defaults to `false`. */
  disabled?: boolean
}

/** A submenu: its trigger row and its panel, inside `Dropdown.Content` or another submenu. */
function DropdownSub({ children, open, defaultOpen, onOpenChange, disabled = false }: DropdownSubProps) {
  const root = useOverlayRoot({ open, defaultOpen })

  return (
    <OverlayContext.Provider value={root.state}>
      <Menu.SubmenuRoot
        open={root.open}
        onOpenChange={(next, details) => {
          // Base UI re-reports a closed submenu as closed once per sibling that opens: the handler hears changes only.
          if (next === root.open) return
          onOpenChange?.(next, details)
          if (!details.isCanceled) root.onOpenChange(next, details)
        }}
        disabled={disabled}
      >
        {children}
      </Menu.SubmenuRoot>
    </OverlayContext.Provider>
  )
}

DropdownSub.displayName = 'DropdownSub'

interface DropdownSubTriggerProps
  extends Omit<MenuItemProps, 'checked' | 'onSelect' | 'closeOnClick' | 'render' | 'asChild' | 'sourceIndex'> {
  /** Dims the row; the pointer and the keyboard skip it. Defaults to `false`. */
  disabled?: boolean
  /** Open the submenu when the pointer rests on the row. Defaults to `true`. */
  openOnHover?: boolean
  /** How long the pointer rests before it opens, in ms. Defaults to `100`. */
  delay?: number
  /** How long a hover-opened submenu waits to close once the pointer leaves, in ms. Defaults to `0`. */
  closeDelay?: number
}

/**
 * The row that opens a submenu, with a trailing chevron. A resting pointer, a
 * press, Enter or ArrowRight opens it; ArrowLeft and Escape close it. The row
 * stays lit while its submenu is open.
 */
const DropdownSubTrigger = forwardRef<HTMLDivElement, DropdownSubTriggerProps>(
  ({ openOnHover = true, delay, closeDelay, ...props }, ref) => {
    const { open } = useOverlay('Dropdown.SubTrigger')
    const parent = useDropdown()
    const Chevron = useIcon('chevron-right')
    const size = useSize()

    const ctx = useMemo<DropdownContextValue>(
      () => ({
        ...parent,
        // Opens a submenu, never takes a pick of the panel's selection.
        selfManaged: false,
        renderMenuItem: ({ disabled, label, onClick, element, children }) => (
          <Menu.SubmenuTrigger
            disabled={disabled}
            label={label}
            onClick={onClick}
            openOnHover={openOnHover}
            delay={delay}
            closeDelay={closeDelay}
            render={element}
          >
            {children}
            <Chevron
              aria-hidden
              size={size.icon}
              strokeWidth={open ? 2 : 1.5}
              className={cn(
                'ml-auto shrink-0 transition-[color,stroke-width] duration-fast',
                open ? 'text-foreground' : 'text-muted-foreground',
              )}
            />
          </Menu.SubmenuTrigger>
        ),
      }),
      [parent, openOnHover, delay, closeDelay, Chevron, size.icon, open],
    )

    return (
      <DropdownContext.Provider value={ctx}>
        <MenuRow ref={ref} pinned={open} {...props} />
      </DropdownContext.Provider>
    )
  },
)

DropdownSubTrigger.displayName = 'DropdownSubTrigger'

interface DropdownSubContentProps
  extends PanelSelectionProps,
    MenuFocusProps,
    AnchorProps,
    MorphProps,
    Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  /** The submenu's rows: the same parts as `Dropdown.Content`, another `Dropdown.Sub` included. */
  children: ReactNode
  /** Side of the trigger row the submenu opens on; it flips when there is no room. Defaults to `"right"`. */
  side?: AnchorProps['side']
  /** Alignment against the trigger row. Defaults to `"start"`: the first rows line up. */
  align?: AnchorProps['align']
  /** Gap to the parent menu in px, the length of the goo neck. Defaults to `8`. */
  sideOffset?: number
  /** Extra classes for the submenu surface: it is 14rem wide by default. */
  className?: string
  /** Keep the submenu mounted (hidden) while closed, so its rows keep their own state across opens. A kept parent keeps it too. Defaults to `false`. */
  keepMounted?: boolean
}

/** The submenu's panel, lifted above the menu it came from and grown out of its trigger row. */
const DropdownSubContent = forwardRef<HTMLDivElement, DropdownSubContentProps>(
  ({ side, align, sideOffset, effect, hideSource, className, ...props }, ref) => (
    <MenuPopup
      ref={ref}
      part="Dropdown.SubContent"
      positioner={{
        ...positionerProps(
          { side, align, sideOffset, effect, hideSource },
          { side: 'right', align: 'start', sideOffset: 8 },
        ),
        // The panel's padding: its first row lines up with the trigger row.
        alignOffset: -4,
      }}
      focusFirstRow={false}
      effect={effect}
      hideSource={hideSource}
      className={cn('w-56 max-w-[var(--available-width)]', className)}
      {...props}
    />
  ),
)

DropdownSubContent.displayName = 'DropdownSubContent'

export type { DropdownSubContentProps, DropdownSubProps, DropdownSubTriggerProps }
export { DropdownSub, DropdownSubContent, DropdownSubTrigger }
