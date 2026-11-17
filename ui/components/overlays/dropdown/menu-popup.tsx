/*!
 * Part of the Fluid Functionalism dropdown port (`registry/base/dropdown.tsx`
 * @ b3587bdbd83fc66c2a6aae3817ffb856cb09260b, MIT © 2026 Micka Touillaud,
 * notice: LICENSE.fluid-functionalism). Local changes: see PORTING.md.
 */

'use client'

import { Menu } from '@base-ui/react/menu'
import {
  type ComponentProps,
  createContext,
  forwardRef,
  type HTMLAttributes,
  type ReactNode,
  type SyntheticEvent,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { FluidHoverHighlight } from '../../../lib/fluid-hover-highlight'
import { GooIndicator } from '../../../lib/goo-indicator'
import { useMergeRefs } from '../../../lib/merge-refs'
import { useOverlay, usePortalContainer } from '../../../lib/overlay'
import { isDisabledRow, POPUP_SHAPE, popupScrollAreaClass, popupViewportClass } from '../../../lib/popup'
import { PopupSurface } from '../../../lib/popup-surface'
import { rowIndexOf } from '../../../lib/row-group'
import { type ItemRect, useFluidHover } from '../../../lib/use-fluid-hover'
import { SelectionBackgrounds, useMergeSplitBlocks, useSelectionRuns } from '../../../lib/use-merge-split'
import { type MorphProps, useMorph } from '../../../lib/use-morph'
import { cn } from '../../../lib/utils'
import { ScrollArea } from '../../../primitives/layout/scroll-area'
import { DropdownFilterContext, DropdownSearchHostContext, useDropdownSearchHost } from './dropdown-search'
import { DropdownContext, type MenuItemRenderOptions } from './menu-item'
import { NO_INDICES, type PanelSelectionProps, usePanelRows, usePanelSelection } from './panel-state'

const NO_RECTS: ItemRect[] = []

/** A submenu's state lives in its parent's portal: a kept popup keeps every submenu below it. */
const KeepMountedContext = createContext(false)

const FIRST_ROW = ['menuitem', 'menuitemradio', 'menuitemcheckbox']
  .map(role => `[role="${role}"]:not([aria-disabled="true"])`)
  .join(', ')

/**
 * A submenu is a React child of the popup that holds its trigger, so its
 * events bubble here through the portal. A popup acts only on its own.
 */
const ownEvent = (e: SyntheticEvent) => (e.currentTarget as Node).contains(e.target as Node)

function renderMenuItem({
  radio,
  checkbox,
  checked,
  value,
  disabled,
  label,
  closeOnClick,
  onClick,
  element,
  children,
}: MenuItemRenderOptions) {
  const shared = { disabled, label, closeOnClick, onClick, render: element }
  if (checkbox)
    return (
      <Menu.CheckboxItem checked={!!checked} {...shared}>
        {children}
      </Menu.CheckboxItem>
    )
  if (radio)
    return (
      <Menu.RadioItem value={value} {...shared}>
        {children}
      </Menu.RadioItem>
    )
  return <Menu.Item {...shared}>{children}</Menu.Item>
}

interface MenuPopupProps extends PanelSelectionProps, MorphProps, Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  /** The name thrown outside a root. */
  part: string
  /** `Menu.Positioner` props: the anchor side and offsets, or none for a context menu at the pointer. */
  positioner: ComponentProps<typeof Menu.Positioner>
  container?: HTMLElement | null
  /** Keep the popup mounted (hidden) while closed, so the submenus inside keep their own state across opens. Submenus inherit it. */
  keepMounted?: boolean
  /** Focus the first enabled row on open, so the menu opens ready to act. */
  focusFirstRow: boolean
  /** Classes for the surface: width, plus the caller's. */
  className?: string
  children: ReactNode
}

/**
 * The body every menu popup shares (Dropdown.Content, ContextMenu.Content):
 * Base UI's Menu popup on the lifted surface, the fluid hover, the selected
 * background (merged runs in multiple selection), the rows' radio group and
 * an optional `Dropdown.Search`. It reads `open` and the morph origin from
 * the root's `OverlayContext`.
 */
export const MenuPopup = forwardRef<HTMLDivElement, MenuPopupProps>(
  (
    {
      part,
      positioner,
      container,
      keepMounted: keepMountedProp,
      focusFirstRow,
      checkedIndex,
      defaultCheckedIndex,
      onCheckedIndexChange,
      checkedIndices,
      defaultCheckedIndices,
      onCheckedIndicesChange,
      from,
      effect,
      hideSource,
      tier = 'moderate',
      className,
      children,
      ...props
    },
    ref,
  ) => {
    const keepMounted = useContext(KeepMountedContext) || (keepMountedProp ?? false)
    const { open, origin } = useOverlay(part)
    const morph = useMorph(open, origin, { from, effect, hideSource, tier })
    const popupRef = useMergeRefs(ref, morph.popupRef)
    const containerRef = useRef<HTMLDivElement>(null)
    const hover = useFluidHover(containerRef, { isItemDisabled: isDisabledRow })
    const { activeIndex, setActiveIndex, itemRects, isMeasured, handlers, registerItem, remeasure } = hover

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
    const search = useDropdownSearchHost(open, { containerRef, setActiveIndex })
    const { hasSearch } = search

    const [pinned, setPinned] = useState<number | null>(null)
    const pin = useCallback((index: number, on: boolean) => setPinned(p => (on ? index : p === index ? null : p)), [])
    const lit = activeIndex ?? pinned
    const shownHover = useMemo(() => ({ ...hover, activeIndex: lit }), [hover, lit])

    // A frame after the primitive's own open focus, which lands on the popup for a pointer open.
    useEffect(() => {
      if (!open || !focusFirstRow) return
      let inner: number | undefined
      const outer = requestAnimationFrame(() => {
        inner = requestAnimationFrame(() => {
          const rowsBox = containerRef.current
          if (hasSearch() || !rowsBox) return
          if (rowsBox.contains(document.activeElement) && document.activeElement !== rowsBox) return
          rowsBox.querySelector<HTMLElement>(FIRST_ROW)?.focus()
        })
      })
      return () => {
        cancelAnimationFrame(outer)
        if (inner !== undefined) cancelAnimationFrame(inner)
      }
    }, [open, focusFirstRow, hasSearch])

    // See lib/overlay.tsx: a popup may be mounted while closed.
    useEffect(() => {
      if (open) remeasure()
      else setActiveIndex(null)
    }, [open, remeasure, setActiveIndex])

    const { multiple } = selection
    const checkedRect =
      isMeasured && !multiple && selection.checkedIndex != null ? (itemRects[selection.checkedIndex] ?? null) : null
    const runs = useSelectionRuns(selection.checkedIndices ?? NO_INDICES)
    const blocks = useMergeSplitBlocks(runs, open ? itemRects : NO_RECTS, POPUP_SHAPE.bgRadius)

    const panel = useMemo(
      () => ({
        registerItem,
        activeIndex: lit,
        checkedIndex: selection.checkedIndex,
        multiple,
        checkedIndices: selection.checkedIndices,
        inMenu: true,
        renderMenuItem,
        selfManaged: selection.selfManaged,
        toggleIndex: selection.toggleIndex,
        pin,
      }),
      [
        pin,
        registerItem,
        lit,
        selection.checkedIndex,
        multiple,
        selection.checkedIndices,
        selection.selfManaged,
        selection.toggleIndex,
      ],
    )

    return (
      <Menu.Portal container={usePortalContainer(container)} keepMounted={keepMounted}>
        <Menu.Positioner className="z-50 outline-none" {...positioner}>
          <KeepMountedContext.Provider value={keepMounted}>
            <DropdownContext.Provider value={panel}>
              <DropdownFilterContext.Provider value={rows.filterCtx}>
                <DropdownSearchHostContext.Provider value={search.host}>
                  <Menu.Popup
                    ref={popupRef}
                    onKeyDownCapture={e => ownEvent(e) && search.onKeyDownCapture(e)}
                    onMouseEnter={handlers.onMouseEnter}
                    onMouseMove={e => ownEvent(e) && handlers.onMouseMove(e)}
                    onClick={e => ownEvent(e) && handlers.onClick(e)}
                    onMouseLeave={() => {
                      handlers.onMouseLeave()
                      if (search.isSearchField(document.activeElement)) search.highlightFirst()
                    }}
                    // No ring: in a menu the highlighted row is the focus indicator.
                    onFocus={e => {
                      if (!ownEvent(e)) return
                      const index = rowIndexOf(e.target)
                      if (index !== null) setActiveIndex(index)
                      else if (search.isSearchField(e.target)) search.highlightFirst()
                      // The popup focusing itself (the pointer left a row) keeps the highlight.
                      else if (e.target !== e.currentTarget) setActiveIndex(null)
                    }}
                    onBlur={e => {
                      if (!ownEvent(e)) return
                      if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setActiveIndex(null)
                    }}
                    className="relative select-none outline-none"
                    {...props}
                  >
                    <PopupSurface
                      morph={morph}
                      radius={POPUP_SHAPE.container}
                      className={cn(
                        'flex max-h-[min(480px,var(--available-height))] flex-col overflow-hidden',
                        POPUP_SHAPE.container,
                        className,
                      )}
                    >
                      <ScrollArea
                        className={popupScrollAreaClass}
                        viewportClassName={cn(popupViewportClass, !search.searchMounted && 'scroll-fade')}
                      >
                        <div ref={containerRef} className="relative flex flex-col p-1">
                          {multiple && <SelectionBackgrounds blocks={blocks} />}
                          {checkedRect && (
                            <GooIndicator
                              rect={checkedRect}
                              opacity={open ? 1 : 0}
                              className={cn('bg-active', POPUP_SHAPE.bg)}
                            />
                          )}
                          <FluidHoverHighlight
                            hover={shownHover}
                            hidden={!open}
                            from={checkedRect}
                            className={POPUP_SHAPE.bg}
                          />
                          {/* display: contents keeps the rows direct flex children for the fluid hover. */}
                          <Menu.RadioGroup value={selection.checkedIndex ?? null} className="contents">
                            {rows.content}
                          </Menu.RadioGroup>
                        </div>
                      </ScrollArea>
                    </PopupSurface>
                  </Menu.Popup>
                </DropdownSearchHostContext.Provider>
              </DropdownFilterContext.Provider>
            </DropdownContext.Provider>
          </KeepMountedContext.Provider>
        </Menu.Positioner>
      </Menu.Portal>
    )
  },
)

MenuPopup.displayName = 'MenuPopup'

export type { MenuPopupProps }
