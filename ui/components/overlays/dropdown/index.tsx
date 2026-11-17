/*!
 * Ported from Fluid Functionalism — github.com/mickadesign/fluid-functionalism
 * `registry/base/dropdown.tsx` @ b3587bdbd83fc66c2a6aae3817ffb856cb09260b
 * MIT License © 2026 Micka Touillaud — fluidfunctionalism.com (notice: LICENSE.fluid-functionalism)
 * Local changes: see PORTING.md.
 */

'use client'

import { Menu, type MenuRootChangeEventDetails } from '@base-ui/react/menu'
import {
  type ForwardRefExoticComponent,
  forwardRef,
  type HTMLAttributes,
  type ReactNode,
  type RefAttributes,
  useMemo,
  useRef,
} from 'react'
import { FluidHoverHighlight } from '../../../lib/fluid-hover-highlight'
import { FocusRing } from '../../../lib/focus-ring'
import { GooIndicator } from '../../../lib/goo-indicator'
import { useMergeRefs } from '../../../lib/merge-refs'
import {
  type AnchorProps,
  type CollisionProps,
  OverlayContext,
  positionerProps,
  useOverlayRoot,
} from '../../../lib/overlay'
import { isDisabledRow, POPUP_SHAPE } from '../../../lib/popup'
import { PopupSeparator } from '../../../lib/popup-rows'
import { useRowGroup } from '../../../lib/row-group'
import { RowOrderContext, useRowOrder } from '../../../lib/row-order'
import type { SizeVariant } from '../../../lib/size-context'
import { type SlotProps, slotPart } from '../../../lib/slot'
import { useFluidHover } from '../../../lib/use-fluid-hover'
import { SelectionBackgrounds, useMergeSplitBlocks, useSelectionRuns } from '../../../lib/use-merge-split'
import type { MorphProps } from '../../../lib/use-morph'
import { cn } from '../../../lib/utils'
import { SizeScope } from '../../../primitives/systems/sizes'
import { Elevated } from '../../../primitives/systems/surface'
import { DropdownEmpty, DropdownFilterContext, DropdownSearch, type DropdownSearchProps } from './dropdown-search'
import {
  DropdownContext,
  type DropdownContextValue,
  DropdownShortcut,
  type DropdownShortcutProps,
  MenuItem,
  type MenuItemProps,
  type MenuItemRenderOptions,
  useDropdown,
} from './menu-item'
import {
  DropdownCheckboxItem,
  type DropdownCheckboxItemProps,
  DropdownGroup,
  type DropdownGroupProps,
  DropdownLabel,
  type DropdownLabelProps,
  DropdownRadioGroup,
  type DropdownRadioGroupProps,
  DropdownRadioItem,
  type DropdownRadioItemProps,
} from './menu-parts'
import { type MenuFocusProps, MenuPopup } from './menu-popup'
import {
  type PanelSelectionProps,
  useCheckedRows,
  usePanelRows,
  usePanelSelection,
  useValueChecked,
} from './panel-state'
import {
  DropdownSub,
  DropdownSubContent,
  type DropdownSubContentProps,
  type DropdownSubProps,
  DropdownSubTrigger,
  type DropdownSubTriggerProps,
} from './submenu'

// Not `Menu.Root.ChangeEventDetails`: bunup's .d.ts renames the `Menu` import, and the `.Menu` static's key with it.
/** What `onOpenChange` receives besides the open state: Base UI's Menu change details (`reason`, `event`, `cancel()`, `isCanceled`). */
type DropdownOpenChangeDetails = MenuRootChangeEventDetails

interface DropdownProps extends HTMLAttributes<HTMLDivElement> {
  /** `Dropdown.Item` rows, plus `Dropdown.Label` and `Dropdown.Separator`. */
  children: ReactNode
  /** The checked row: drives the animated selected background and the rows' radio semantics. */
  checkedIndex?: number
  /** Uncontrolled twin of `checkedIndex`: the panel owns the selection, so rows need no `checked` or `onSelect` of their own. */
  defaultCheckedIndex?: number
  /** Called with the newly checked row, or `undefined` when nothing is checked. */
  onCheckedIndexChange?: (index: number | undefined) => void
  /** Multiple selection: the checked rows. Rows become checkbox items and contiguous runs share one merged background (see Checkbox.Group). */
  checkedIndices?: number[]
  /** Uncontrolled twin of `checkedIndices`: the panel toggles rows itself. */
  defaultCheckedIndices?: number[]
  /** Called with every checked row after a toggle. */
  onCheckedIndicesChange?: (indices: number[]) => void
  /** Pins the panel's rows to one step of the size ladder (default 36px, compact 28px — see Sizes). Omitted, they follow the surrounding SizeProvider. */
  size?: SizeVariant
  /** Extra classes for the panel surface — it is 18rem wide by default. */
  className?: string
}

type DropdownComponent = ForwardRefExoticComponent<DropdownProps & RefAttributes<HTMLDivElement>> & {
  Menu: typeof DropdownMenu
  Trigger: typeof DropdownTrigger
  Content: typeof DropdownContent
  Item: typeof MenuItem
  Label: typeof DropdownLabel
  Separator: typeof DropdownSeparator
  Search: typeof DropdownSearch
  Empty: typeof DropdownEmpty
  Group: typeof DropdownGroup
  Shortcut: typeof DropdownShortcut
  CheckboxItem: typeof DropdownCheckboxItem
  RadioGroup: typeof DropdownRadioGroup
  RadioItem: typeof DropdownRadioItem
  Sub: typeof DropdownSub
  SubTrigger: typeof DropdownSubTrigger
  SubContent: typeof DropdownSubContent
}

/**
 * A menu in two forms: an inline panel that sits in the page, or a popup on
 * any trigger you like.
 *
 * `Dropdown` is the inline panel — an elevated surface with the fluid hover
 * background gliding between rows, a selected background that springs to the
 * picked one, contiguous picks merging into a single block in multiple mode,
 * and an animated focus ring. It sits in the page, so it is a plain
 * `role="group"` (name it with `aria-label`), not a menu. `Dropdown.Menu` +
 * `Dropdown.Trigger` + `Dropdown.Content` is the same panel as a popup on
 * Base UI's Menu, which brings the positioning, dismissal, roving highlight,
 * typeahead and close-on-select; the popup oozes out of its trigger and back
 * through the shared morph (see Morph), goo by default, and opens with its
 * first row focused. Both take `checkedIndex` / `checkedIndices` to be driven
 * from outside, or `defaultCheckedIndex` / `defaultCheckedIndices` to run
 * themselves — and a `Dropdown.Search` marked `filter` makes the panel own
 * the query too, keeping only the rows whose `label` matches and showing
 * `Dropdown.Empty` when none do.
 *
 * Rows number themselves in document order, inside groups, fragments and
 * conditions too, so `index` is needed only to key a row on something else.
 * Captions, rules, the search and the empty state take no number. A row
 * takes a `label` or its content as `children` (with `textValue` for
 * typeahead and the filter), `inset` lines it up with rows that have an
 * icon, and `shortcut` (or a `Dropdown.Shortcut`) adds a muted key hint.
 * `Dropdown.CheckboxItem` and `Dropdown.RadioGroup` / `Dropdown.RadioItem`
 * select by their own state and value instead of by index; their checked
 * rows melt into one background like a multiple selection.
 * `Dropdown.Group` names a run of rows with the `Dropdown.Label` inside it.
 *
 * In the popup, `Dropdown.Sub` nests a
 * menu: its `Dropdown.SubTrigger` row opens a `Dropdown.SubContent` beside it
 * on hover, a press or ArrowRight (ArrowLeft and Escape close it), grown out
 * of that row through the same morph, with rows, selection and fluid hover of
 * its own. The trigger row stays lit while its submenu is open.
 *
 * Statics:
 * - `Dropdown.Menu` — the popup root: `open`, `defaultOpen`, `onOpenChange`
 *   (with Base UI's details: `reason`, `cancel()`), `disabled`, `modal`, `size`.
 * - `Dropdown.Trigger` — `render` or `asChild`.
 * - `Dropdown.Content` — the popup panel: the selection props above, `side`,
 *   `align`, `sideOffset`, `alignOffset`, `collisionPadding`,
 *   `collisionBoundary`, `positionerClassName`, `container`, `keepMounted`, `initialFocus`,
 *   `finalFocus` and the morph options `from`, `effect`, `hideSource`, `tier`.
 * - `Dropdown.Item` — a row: `label` or `children`, `textValue`, `icon`,
 *   `index`, `inset`, `checked`, `onSelect(event)` (`preventDefault()` keeps
 *   the menu open), `shortcut`, `closeOnClick`, `disabled`, `render` /
 *   `asChild`.
 * - `Dropdown.CheckboxItem` — a row toggling itself: `checked`,
 *   `defaultChecked`, `onCheckedChange`, `closeOnClick` (default `false`).
 * - `Dropdown.RadioGroup` / `Dropdown.RadioItem` — one choice by value:
 *   `value`, `defaultValue`, `onValueChange` on the group, `value` on each row.
 * - `Dropdown.Group` / `Dropdown.Label` — a named run of rows and its caption
 *   (`inset`).
 * - `Dropdown.Separator` — a rule between runs.
 * - `Dropdown.Shortcut` — a muted key hint at a row's end.
 * - `Dropdown.Search` / `Dropdown.Empty` — a filter field and its no-match row.
 * - `Dropdown.Sub` / `Dropdown.SubTrigger` / `Dropdown.SubContent` — in the
 *   popup, a submenu: its state (`open`, `defaultOpen`, `onOpenChange` with
 *   the details, `disabled`), its trigger row (a row's props plus
 *   `openOnHover`, `delay`, `closeDelay`) and its panel (Dropdown.Content's
 *   props; it opens on the right, aligned to the start, 8px out).
 *
 * @example {@include ./examples.mdx}
 * @source https://github.com/mickadesign/fluid-functionalism/blob/b3587bdbd83fc66c2a6aae3817ffb856cb09260b/registry/base/dropdown.tsx Fluid Functionalism
 * @license MIT © 2026 Micka Touillaud
 */
const Dropdown = forwardRef<HTMLDivElement, DropdownProps>(
  (
    {
      children,
      checkedIndex,
      defaultCheckedIndex,
      onCheckedIndexChange,
      checkedIndices,
      defaultCheckedIndices,
      onCheckedIndicesChange,
      size,
      className,
      ...props
    },
    ref,
  ) => {
    const containerRef = useRef<HTMLDivElement>(null)
    const mergedRef = useMergeRefs(containerRef, ref)
    const hover = useFluidHover(containerRef, { isItemDisabled: isDisabledRow })
    const { activeIndex, itemRects, handlers, registerItem } = hover
    const focus = useRowGroup(hover, { axis: 'xy' })

    const rowOrder = useRowOrder()
    const { valueChecked, reportChecked } = useValueChecked()
    const rows = usePanelRows(children)
    const selection = usePanelSelection(
      {
        checkedIndex,
        defaultCheckedIndex,
        onCheckedIndexChange,
        checkedIndices,
        defaultCheckedIndices,
        onCheckedIndicesChange,
      },
      rows.sourceOf,
      rows.filtering,
    )

    const { multiple } = selection
    const checkedRect = !multiple && selection.checkedIndex != null ? (itemRects[selection.checkedIndex] ?? null) : null
    const runs = useSelectionRuns(useCheckedRows(selection.checkedIndices, valueChecked))
    const blocks = useMergeSplitBlocks(runs, itemRects, POPUP_SHAPE.bgRadius)
    const panel = useMemo(
      () => ({
        registerItem,
        activeIndex,
        checkedIndex: selection.checkedIndex,
        multiple,
        checkedIndices: selection.checkedIndices,
        selfManaged: selection.selfManaged,
        toggleIndex: selection.toggleIndex,
        reportChecked,
      }),
      [
        registerItem,
        activeIndex,
        selection.checkedIndex,
        multiple,
        selection.checkedIndices,
        selection.selfManaged,
        selection.toggleIndex,
        reportChecked,
      ],
    )

    return (
      <SizeScope size={size}>
        <RowOrderContext.Provider value={rowOrder}>
          <DropdownContext.Provider value={panel}>
            <DropdownFilterContext.Provider value={rows.filterCtx}>
              <Elevated
                offset={2}
                shadowLevel={3}
                ref={mergedRef}
                onMouseEnter={handlers.onMouseEnter}
                onMouseMove={handlers.onMouseMove}
                onMouseLeave={handlers.onMouseLeave}
                onClick={handlers.onClick}
                {...focus.handlers}
                role="group"
                className={cn('relative flex w-72 max-w-full flex-col p-1 select-none', className)}
                {...props}
              >
                <SelectionBackgrounds blocks={blocks} />
                {checkedRect && <GooIndicator rect={checkedRect} className={cn('bg-active', POPUP_SHAPE.bg)} />}
                <FluidHoverHighlight hover={hover} from={checkedRect} className={POPUP_SHAPE.bg} />
                <FocusRing rect={focus.focusRect} className={POPUP_SHAPE.focusRing} />
                {rows.content}
              </Elevated>
            </DropdownFilterContext.Provider>
          </DropdownContext.Provider>
        </RowOrderContext.Provider>
      </SizeScope>
    )
  },
) as DropdownComponent

Dropdown.displayName = 'Dropdown'

interface DropdownMenuProps {
  /** `Dropdown.Trigger` and `Dropdown.Content`. */
  children: ReactNode
  /** Controlled open state. Pair with `onOpenChange`. */
  open?: boolean
  /** Initial open state — uncontrolled. Defaults to `false`. */
  defaultOpen?: boolean
  /** Called when the menu opens or closes, with Base UI's change details: `reason` (`'trigger-press'`, `'item-press'`, `'outside-press'`, `'escape-key'`, …), the `event`, and `cancel()` to keep it as it is. */
  onOpenChange?: (open: boolean, details: DropdownOpenChangeDetails) => void
  /** Disables the menu. Defaults to `false`. */
  disabled?: boolean
  /** Locks the page scroll while the menu is open and keeps the pointer off everything outside it. Non-modal, the page keeps scrolling and the popup follows its trigger. Defaults to `false`. */
  modal?: boolean
  /** Pins trigger-side content and the portalled popup rows to one step of the size ladder (default 36px, compact 28px — see Sizes). Omitted, they follow the surrounding SizeProvider. */
  size?: SizeVariant
}

function DropdownMenu({
  children,
  open,
  defaultOpen,
  onOpenChange,
  disabled = false,
  modal = false,
  size,
}: DropdownMenuProps) {
  // Reported here rather than through the root's state, so the handler gets the details and can cancel.
  const root = useOverlayRoot({ open, defaultOpen })

  return (
    <SizeScope size={size}>
      <OverlayContext.Provider value={root.state}>
        <Menu.Root
          open={root.open}
          onOpenChange={(next, details) => {
            onOpenChange?.(next, details)
            if (!details.isCanceled) root.onOpenChange(next, details)
          }}
          disabled={disabled}
          modal={modal}
        >
          {children}
        </Menu.Root>
      </OverlayContext.Provider>
    </SizeScope>
  )
}

DropdownMenu.displayName = 'DropdownMenu'

interface DropdownTriggerProps extends SlotProps {
  /** Open on hover as well as on press. Defaults to `false`. */
  openOnHover?: boolean
  /** Hover delay before opening, in ms. Needs `openOnHover`. */
  delay?: number
  /** Delay before closing once the pointer leaves, in ms. Needs `openOnHover`. */
  closeDelay?: number
}

const DropdownTrigger = slotPart<DropdownTriggerProps>(Menu.Trigger, 'DropdownTrigger')

interface DropdownContentProps
  extends PanelSelectionProps,
    MenuFocusProps,
    AnchorProps,
    CollisionProps,
    MorphProps,
    Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  /** `Dropdown.Item` rows, plus `Dropdown.Label`, `Dropdown.Separator`, `Dropdown.Search`, `Dropdown.Empty`. */
  children: ReactNode
  /** Extra classes for the popup surface — it is 18rem wide by default, at least the trigger's width. */
  className?: string
  /** Keep the popup mounted (hidden) while closed, so the submenus inside, which inherit it, keep their own selection across opens. Defaults to `false`. */
  keepMounted?: boolean
}

const DropdownContent = forwardRef<HTMLDivElement, DropdownContentProps>(
  (
    {
      side,
      align,
      sideOffset,
      alignOffset,
      collisionPadding,
      collisionBoundary,
      positionerClassName,
      effect,
      hideSource,
      className,
      ...props
    },
    ref,
  ) => (
    <MenuPopup
      ref={ref}
      part="Dropdown.Content"
      positioner={positionerProps(
        {
          side,
          align,
          sideOffset,
          alignOffset,
          collisionPadding,
          collisionBoundary,
          positionerClassName,
          effect,
          hideSource,
        },
        { side: 'bottom', align: 'start', sideOffset: 6 },
      )}
      focusFirstRow
      effect={effect}
      hideSource={hideSource}
      className={cn('w-72 max-w-full min-w-[var(--anchor-width)]', className)}
      {...props}
    />
  ),
)

DropdownContent.displayName = 'DropdownContent'

const DropdownSeparator = PopupSeparator

Object.assign(Dropdown, {
  Menu: DropdownMenu,
  Trigger: DropdownTrigger,
  Content: DropdownContent,
  Item: MenuItem,
  Label: DropdownLabel,
  Separator: DropdownSeparator,
  Search: DropdownSearch,
  Empty: DropdownEmpty,
  Group: DropdownGroup,
  Shortcut: DropdownShortcut,
  CheckboxItem: DropdownCheckboxItem,
  RadioGroup: DropdownRadioGroup,
  RadioItem: DropdownRadioItem,
  Sub: DropdownSub,
  SubTrigger: DropdownSubTrigger,
  SubContent: DropdownSubContent,
})

export type {
  DropdownCheckboxItemProps,
  DropdownContentProps,
  DropdownContextValue,
  DropdownGroupProps,
  DropdownLabelProps,
  DropdownMenuProps,
  DropdownOpenChangeDetails,
  DropdownProps,
  DropdownRadioGroupProps,
  DropdownRadioItemProps,
  DropdownSearchProps,
  DropdownShortcutProps,
  DropdownSubContentProps,
  DropdownSubProps,
  DropdownSubTriggerProps,
  DropdownTriggerProps,
  MenuItemProps,
  MenuItemRenderOptions,
}
export {
  Dropdown,
  DropdownCheckboxItem,
  DropdownContent,
  DropdownEmpty,
  DropdownGroup,
  DropdownLabel,
  DropdownMenu,
  DropdownRadioGroup,
  DropdownRadioItem,
  DropdownSearch,
  DropdownSeparator,
  DropdownShortcut,
  DropdownSub,
  DropdownSubContent,
  DropdownSubTrigger,
  DropdownTrigger,
  MenuItem,
  useDropdown,
}
export default Dropdown
