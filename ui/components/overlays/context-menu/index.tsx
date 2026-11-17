/*
 * Local addition (not part of Fluid Functionalism): a context menu that grows
 * out of the press point. Behavior is Base UI's ContextMenu; the popup body,
 * rows and submenus are Dropdown's (`dropdown/menu-popup.tsx`,
 * `dropdown/menu-item.tsx`, `dropdown/submenu.tsx`).
 */

'use client'

import { ContextMenu as ContextMenuPrimitive } from '@base-ui/react/context-menu'
import { forwardRef, type HTMLAttributes, type ReactNode, type RefObject } from 'react'
import { OverlayContext, useOverlayRoot } from '../../../lib/overlay'
import type { SizeVariant } from '../../../lib/size-context'
import type { MorphProps, MorphSide } from '../../../lib/use-morph'
import { cn } from '../../../lib/utils'
import { SizeScope } from '../../../primitives/systems/sizes'
import { DropdownLabel, DropdownSeparator } from '../dropdown'
import { MenuItem, type MenuItemProps } from '../dropdown/menu-item'
import { type MenuFocusProps, MenuPopup } from '../dropdown/menu-popup'
import type { PanelSelectionProps } from '../dropdown/panel-state'
import { DropdownSub, DropdownSubContent, DropdownSubTrigger } from '../dropdown/submenu'

interface ContextMenuContentProps
  extends PanelSelectionProps,
    MenuFocusProps,
    Omit<MorphProps, 'from'>,
    Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  /** Where the menu grows from (see Morph): the press point, its own center, a viewport edge, or a ref to any element. Defaults to `'pointer'`. */
  from?: 'pointer' | 'center' | MorphSide | RefObject<HTMLElement | null>
  /** Portal target. Defaults to the nearest `PortalContainer`, else the document body. */
  container?: HTMLElement | null
  /** Extra classes for the menu surface — it is 14rem wide by default. */
  className?: string
  /** `ContextMenu.Item` rows, plus `ContextMenu.Label`, `ContextMenu.Separator` and `ContextMenu.Sub`. */
  children?: ReactNode
  /** Keep the menu mounted (hidden) while closed, so the submenus inside, which inherit it, keep their own selection across opens. Defaults to `false`. */
  keepMounted?: boolean
}

const ContextMenuContent = forwardRef<HTMLDivElement, ContextMenuContentProps>(
  ({ from = 'pointer', className, children, ...props }, ref) => (
    // A context menu opens under the pointer, where the hover already is: no first-row focus.
    <MenuPopup
      ref={ref}
      part="ContextMenu.Content"
      positioner={{}}
      focusFirstRow={false}
      from={from}
      className={cn('w-56', className)}
      {...props}
    >
      {children}
    </MenuPopup>
  ),
)
ContextMenuContent.displayName = 'ContextMenuContent'

interface ContextMenuProps {
  /** Controlled open state. Pair with `onOpenChange`. */
  open?: boolean
  /** Initial open state, for an uncontrolled menu. Defaults to `false`. */
  defaultOpen?: boolean
  /** Called when the menu opens or closes. */
  onOpenChange?: (open: boolean) => void
  /** Turns the trigger area back into a plain one: no menu on right click or long press. Defaults to `false`. */
  disabled?: boolean
  /** Pins the rows to one step of the size ladder (default 36px, compact 28px — see Sizes). Omitted, they follow the surrounding SizeProvider. */
  size?: SizeVariant
  /** The area and the menu — `ContextMenu.Trigger` plus a `ContextMenu.Content`. */
  children?: ReactNode
}

/**
 * A menu that grows out of the pointer on right click, or on a long press on
 * touch: the surface swells from the exact point you pressed into the menu.
 *
 * The morph comes from the shared engine (see Morph): from the press point
 * by default, or from its own center, a viewport edge or any element, with
 * the goo, a plain morph, a slide or a fade. The menu body and rows are
 * Dropdown's — the fluid hover background gliding between them, icons that
 * firm up under it, dimmed disabled rows the pointer skips, a keyboard
 * shortcut at the end of a row, and the same selection: rows with a boolean
 * `checked` are radio options (checkbox options under `checkedIndices`). The
 * menu lifts 2 surface levels off its substrate. `ContextMenu.Sub` nests a
 * menu, exactly as Dropdown's does: its row opens the panel beside it on
 * hover, a press, Enter or ArrowRight, the panel grows out of that row, and
 * ArrowLeft or Escape closes one level. Built on Base UI's
 * ContextMenu: it opens at the pointer and flips or shifts to stay on screen,
 * arrow keys and typeahead move between rows, and picking a row, Escape or
 * an outside press closes it.
 *
 * Statics:
 * - `ContextMenu.Trigger` — the area that opens it (a `div`).
 * - `ContextMenu.Content` — the menu: Dropdown's selection props
 *   (`checkedIndex`, `defaultCheckedIndex`, `checkedIndices`, …),
 *   `container`, `keepMounted`, `initialFocus`, `finalFocus`, and the morph
 *   options `from`, `effect`, `hideSource`, `tier`.
 * - `ContextMenu.Item` — Dropdown's row (`MenuItem`, also exported as
 *   `ContextMenuItem`): `label` or `children`, `textValue`, `index`, `icon`,
 *   `inset`, `shortcut`, `checked`, `onSelect(event)`, `disabled`.
 * - `ContextMenu.Label` / `ContextMenu.Separator` — a caption over a run of
 *   rows and a rule between runs.
 * - `ContextMenu.Sub` — a submenu (`open`, `defaultOpen`, `onOpenChange`,
 *   `disabled`): a `ContextMenu.SubTrigger` row (`label`, `icon`, `index`,
 *   `disabled`, `openOnHover`, `delay`, `closeDelay`) and a
 *   `ContextMenu.SubContent` panel (the Content's selection and morph props,
 *   plus `side`, `align`, `sideOffset`). Submenus nest.
 *
 * @example {@include ./examples.mdx}
 */
const ContextMenu = Object.assign(
  function ContextMenu({ open, defaultOpen, onOpenChange, disabled = false, size, children }: ContextMenuProps) {
    const root = useOverlayRoot({ open, defaultOpen, onOpenChange })

    return (
      <SizeScope size={size}>
        <OverlayContext.Provider value={root.state}>
          <ContextMenuPrimitive.Root open={root.open} disabled={disabled} onOpenChange={root.onOpenChange}>
            {children}
          </ContextMenuPrimitive.Root>
        </OverlayContext.Provider>
      </SizeScope>
    )
  },
  {
    Trigger: ContextMenuPrimitive.Trigger,
    Content: ContextMenuContent,
    Item: MenuItem,
    Label: DropdownLabel,
    Separator: DropdownSeparator,
    Sub: DropdownSub,
    SubTrigger: DropdownSubTrigger,
    SubContent: DropdownSubContent,
  },
)

/** `ContextMenu.Item` by name: Dropdown's row. */
const ContextMenuItem = MenuItem
type ContextMenuItemProps = MenuItemProps

export type { ContextMenuContentProps, ContextMenuItemProps, ContextMenuProps }
export { ContextMenu, ContextMenuContent, ContextMenuItem }

export default ContextMenu
