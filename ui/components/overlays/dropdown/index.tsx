/*!
 * Ported from Fluid Functionalism — github.com/mickadesign/fluid-functionalism
 * `registry/base/dropdown.tsx` @ b3587bdbd83fc66c2a6aae3817ffb856cb09260b
 * MIT License © 2026 Micka Touillaud — fluidfunctionalism.com (notice: LICENSE.fluid-functionalism)
 * Local changes: see PORTING.md.
 */

'use client'

import { Menu } from '@base-ui/react/menu'
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
import { type AnchorProps, OverlayContext, positionerProps, useOverlayRoot } from '../../../lib/overlay'
import { isDisabledRow } from '../../../lib/popup'
import { PopupLabel, PopupSeparator } from '../../../lib/popup-rows'
import { useRowGroup } from '../../../lib/row-group'
import type { SizeVariant } from '../../../lib/size-context'
import { type SlotProps, slotPart } from '../../../lib/slot'
import { useFluidHover } from '../../../lib/use-fluid-hover'
import { SelectionBackgrounds, useMergeSplitBlocks, useSelectionRuns } from '../../../lib/use-merge-split'
import type { MorphProps } from '../../../lib/use-morph'
import { cn } from '../../../lib/utils'
import { SizeScope } from '../../../primitives/sizes'
import { Elevated } from '../../../primitives/surface'
import { DropdownEmpty, DropdownFilterContext, DropdownSearch, type DropdownSearchProps } from './dropdown-search'
import {
  DropdownContext,
  type DropdownContextValue,
  MenuItem,
  type MenuItemRenderOptions,
  menuShape,
  useDropdown,
  useDropdownMaybe,
} from './menu-item'
import { MenuPopup } from './menu-popup'
import { NO_INDICES, type PanelSelectionProps, usePanelRows, usePanelSelection } from './panel-state'

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
 * Statics: Dropdown.Menu (the popup root: open, defaultOpen, onOpenChange,
 * disabled, size), Dropdown.Trigger (render or asChild), Dropdown.Content
 * (the popup panel: the selection props above, side, align, sideOffset,
 * container and the morph options from, effect, hideSource, tier),
 * Dropdown.Item (a row: index, label, icon, checked, onSelect, shortcut,
 * disabled), Dropdown.Label, Dropdown.Separator, Dropdown.Search and
 * Dropdown.Empty.
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
    const runs = useSelectionRuns(selection.checkedIndices ?? NO_INDICES)
    const blocks = useMergeSplitBlocks(runs, itemRects, menuShape.bgRadius)
    const panel = useMemo(
      () => ({
        registerItem,
        activeIndex,
        checkedIndex: selection.checkedIndex,
        multiple,
        checkedIndices: selection.checkedIndices,
        selfManaged: selection.selfManaged,
        toggleIndex: selection.toggleIndex,
      }),
      [
        registerItem,
        activeIndex,
        selection.checkedIndex,
        multiple,
        selection.checkedIndices,
        selection.selfManaged,
        selection.toggleIndex,
      ],
    )

    return (
      <SizeScope size={size}>
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
              {multiple && <SelectionBackgrounds blocks={blocks} />}
              {checkedRect && <GooIndicator rect={checkedRect} className={cn('bg-active', menuShape.bg)} />}
              <FluidHoverHighlight hover={hover} from={checkedRect} className={menuShape.bg} />
              <FocusRing rect={focus.focusRect} className={menuShape.focusRing} />
              {rows.content}
            </Elevated>
          </DropdownFilterContext.Provider>
        </DropdownContext.Provider>
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
  /** Called when the menu opens or closes. */
  onOpenChange?: (open: boolean) => void
  /** Disables the menu. Defaults to `false`. */
  disabled?: boolean
  /** Pins trigger-side content and the portalled popup rows to one step of the size ladder (default 36px, compact 28px — see Sizes). Omitted, they follow the surrounding SizeProvider. */
  size?: SizeVariant
}

function DropdownMenu({ children, open, defaultOpen, onOpenChange, disabled = false, size }: DropdownMenuProps) {
  const root = useOverlayRoot({ open, defaultOpen, onOpenChange })

  return (
    <SizeScope size={size}>
      <OverlayContext.Provider value={root.state}>
        {/* Non-modal: the page keeps scrolling and the popup follows its trigger. */}
        <Menu.Root open={root.open} onOpenChange={root.onOpenChange} disabled={disabled} modal={false}>
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
    AnchorProps,
    MorphProps,
    Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  /** `Dropdown.Item` rows, plus `Dropdown.Label`, `Dropdown.Separator`, `Dropdown.Search`, `Dropdown.Empty`. */
  children: ReactNode
  /** Extra classes for the popup surface — it is 18rem wide by default, at least the trigger's width. */
  className?: string
}

const DropdownContent = forwardRef<HTMLDivElement, DropdownContentProps>(
  ({ side, align, sideOffset, effect, hideSource, className, ...props }, ref) => (
    <MenuPopup
      ref={ref}
      part="Dropdown.Content"
      positioner={positionerProps(
        { side, align, sideOffset, effect, hideSource },
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

const DropdownLabel = PopupLabel
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
})

export type {
  DropdownContentProps,
  DropdownContextValue,
  DropdownMenuProps,
  DropdownProps,
  DropdownSearchProps,
  DropdownTriggerProps,
  MenuItemRenderOptions,
}
export {
  Dropdown,
  DropdownContent,
  DropdownEmpty,
  DropdownLabel,
  DropdownMenu,
  DropdownSearch,
  DropdownSeparator,
  DropdownTrigger,
  MenuItem,
  useDropdown,
  useDropdownMaybe,
}
export default Dropdown
