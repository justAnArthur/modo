/*!
 * Part of the Fluid Functionalism combobox port (`registry/base/combobox.tsx`
 * @ b3587bdbd83fc66c2a6aae3817ffb856cb09260b, MIT © 2026 Micka Touillaud,
 * notice: LICENSE.fluid-functionalism). Local changes: see PORTING.md.
 */

'use client'

import { Combobox as ComboboxPrimitive } from '@base-ui/react/combobox'
import {
  forwardRef,
  type HTMLAttributes,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { FluidHoverHighlight } from '../../../lib/fluid-hover-highlight'
import { GooIndicator } from '../../../lib/goo-indicator'
import { type IconComponent, useIcon } from '../../../lib/icon-context'
import { useMergeRefs } from '../../../lib/merge-refs'
import { type AnchorProps, positionerProps, useOverlay, usePortalContainer } from '../../../lib/overlay'
import { isDisabledRow, POPUP_SHAPE, popupScrollAreaClass, popupViewportClass } from '../../../lib/popup'
import { CheckMark, RowIcon, rowClasses, rowLabelBoxClass } from '../../../lib/popup-rows'
import { PopupSurface } from '../../../lib/popup-surface'
import { useSize } from '../../../lib/size-context'
import { useFluidHover, useRegisterFluidHoverItem } from '../../../lib/use-fluid-hover'
import { SelectionBackgrounds, useMergeSplitBlocks, useSelectionRuns } from '../../../lib/use-merge-split'
import { type MorphProps, useMorph } from '../../../lib/use-morph'
import { cn } from '../../../lib/utils'
import { ScrollArea } from '../../../primitives/scroll-area'
import {
  ComboboxHighlightContext,
  type ComboboxItemData,
  ComboboxItemIndexContext,
  ComboboxListContext,
  CREATE_VALUE,
  isCreateItem,
  itemValue,
  useComboboxContext,
} from './context'

/** What `Combobox.Content`'s `footer` gets when it is a function. */
interface ComboboxFooterContext {
  /** Closes the popup. */
  close: () => void
  /** The trimmed query. */
  query: string
}

/** A node, or a function of the popup's state, rendered under the list. */
type ComboboxFooter = ReactNode | ((context: ComboboxFooterContext) => ReactNode)

interface ComboboxContentProps extends AnchorProps, MorphProps, Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  /** Classes for the popup surface — merged after the radius and max-height. */
  className?: string
  /** `Combobox.Empty` and `Combobox.List`. */
  children: ReactNode
  /** Pinned under the list, past a hairline: a "Load more" or "Add new…" action. A function gets `{ close, query }`. */
  footer?: ComboboxFooter
}

export const ComboboxContent = forwardRef<HTMLDivElement, ComboboxContentProps>(
  (
    {
      side,
      align,
      sideOffset,
      container,
      from,
      effect,
      hideSource,
      tier = 'moderate',
      footer,
      className,
      children,
      ...props
    },
    ref,
  ) => {
    const { open, origin } = useOverlay('Combobox.Content')
    const { anchorRef, close, inputValue } = useComboboxContext()
    const morph = useMorph(open, origin, { from, effect, hideSource, tier })
    const popupRef = useMergeRefs(ref, morph.popupRef)
    const footerNode = typeof footer === 'function' ? footer({ close, query: inputValue.trim() }) : footer

    return (
      <ComboboxPrimitive.Portal container={usePortalContainer(container)}>
        <ComboboxPrimitive.Positioner
          anchor={anchorRef}
          {...positionerProps(
            { side, align, sideOffset, effect, hideSource },
            { side: 'bottom', align: 'start', sideOffset: 6 },
          )}
        >
          <ComboboxPrimitive.Popup ref={popupRef} className="relative select-none outline-none" {...props}>
            <PopupSurface
              morph={morph}
              radius={POPUP_SHAPE.container}
              className={cn(
                'flex min-w-[var(--anchor-width)] max-h-[min(300px,var(--available-height))] flex-col overflow-hidden',
                POPUP_SHAPE.container,
                className,
              )}
            >
              {children}
              {footerNode !== undefined && footerNode !== null && footerNode !== false && (
                // Outside the scrolling list, so it stays put while the rows scroll.
                <div className="shrink-0 border-t border-border p-1">{footerNode}</div>
              )}
            </PopupSurface>
          </ComboboxPrimitive.Popup>
        </ComboboxPrimitive.Positioner>
      </ComboboxPrimitive.Portal>
    )
  },
)

ComboboxContent.displayName = 'ComboboxContent'

interface ComboboxListProps {
  /** Classes for the rows' container. */
  className?: string
  /** Render one row per matching item: `(item, index) => <Combobox.Item …/>`. Rows get their index from the list. */
  children: (item: ComboboxItemData, index: number) => ReactNode
}

export const ComboboxList = forwardRef<HTMLDivElement, ComboboxListProps>(({ className, children }, ref) => {
  const { open } = useOverlay('Combobox.List')
  const { multiple, inputValue, createRow, loading, loadingLabel } = useComboboxContext()
  const highlight = useContext(ComboboxHighlightContext)
  const PlusIcon = useIcon('plus')
  const LoaderIcon = useIcon('loader')
  const size = useSize()
  const containerRef = useRef<HTMLDivElement>(null)
  const listRef = useMergeRefs(containerRef, ref)
  const hover = useFluidHover(containerRef, { isItemDisabled: isDisabledRow })
  const { activeIndex, setActiveIndex, itemRects, isMeasured, handlers, registerItem, remeasure } = hover
  const [checkedIndices, setCheckedIndices] = useState<number[]>([])

  const setChecked = useCallback((index: number, checked: boolean) => {
    setCheckedIndices(prev => {
      if (!checked) return prev.filter(i => i !== index)
      return prev.includes(index) ? prev : [...prev, index].sort((a, b) => a - b)
    })
  }, [])

  // See lib/overlay.tsx: a popup may be mounted while closed.
  useEffect(() => {
    if (open) remeasure()
    else setActiveIndex(null)
  }, [open, remeasure, setActiveIndex])

  // Typing re-filters the rows under the overlays, and those frames snap: an
  // overlay springing to where its row landed reads as the list smearing. The
  // flag arms on the query's render and holds until rects from the new row set land.
  const reflowRef = useRef(false)
  const prevQueryRef = useRef(inputValue)
  const armedRectsRef = useRef(itemRects)
  if (prevQueryRef.current !== inputValue) {
    prevQueryRef.current = inputValue
    armedRectsRef.current = itemRects
    reflowRef.current = true
  }
  const reflowSnap = reflowRef.current
  useEffect(() => {
    if (reflowRef.current && itemRects !== armedRectsRef.current) reflowRef.current = false
  })

  // A keyboard or auto highlight drives the hover background, the only indicator: no ring.
  useEffect(() => {
    if (!highlight) setActiveIndex(null)
    else if (highlight.keyboard) setActiveIndex(highlight.index)
  }, [highlight, setActiveIndex])

  const firstChecked = checkedIndices[0]
  const checkedRect = isMeasured && !multiple && firstChecked !== undefined ? (itemRects[firstChecked] ?? null) : null
  const runs = useSelectionRuns(multiple ? checkedIndices : [])
  const blocks = useMergeSplitBlocks(runs, isMeasured && open ? itemRects : [], POPUP_SHAPE.bgRadius)
  const listCtx = useMemo(() => ({ registerItem, activeIndex, setChecked }), [registerItem, activeIndex, setChecked])

  return (
    <ComboboxListContext.Provider value={listCtx}>
      <ScrollArea className={popupScrollAreaClass} viewportClassName={cn(popupViewportClass, 'scroll-fade')}>
        <ComboboxPrimitive.List
          ref={listRef}
          onMouseEnter={handlers.onMouseEnter}
          onMouseMove={handlers.onMouseMove}
          onMouseLeave={handlers.onMouseLeave}
          onClick={handlers.onClick}
          // The list is the overlays' offsetParent, so they scroll with the rows.
          className={cn('relative flex flex-col p-1 outline-none data-[empty]:p-0', className)}
        >
          {multiple && (
            <SelectionBackgrounds blocks={reflowSnap ? blocks.map(b => ({ ...b, instant: true })) : blocks} />
          )}
          {checkedRect && (
            <GooIndicator
              rect={checkedRect}
              opacity={open ? 1 : 0}
              transition={reflowSnap ? false : undefined}
              className={cn('bg-active', POPUP_SHAPE.bg)}
            />
          )}
          <FluidHoverHighlight
            hover={hover}
            hidden={!open}
            className={POPUP_SHAPE.bg}
            transition={reflowSnap ? false : undefined}
          />
          {/* An explicit Collection: a function child on List would have to be its only child. */}
          <ComboboxPrimitive.Collection>
            {(item: ComboboxItemData, index: number) => (
              <ComboboxItemIndexContext.Provider key={itemValue(item)} value={index}>
                {isCreateItem(item) ? (
                  <ComboboxItem value={CREATE_VALUE} icon={PlusIcon}>
                    {createRow}
                  </ComboboxItem>
                ) : (
                  children(item, index)
                )}
              </ComboboxItemIndexContext.Provider>
            )}
          </ComboboxPrimitive.Collection>
        </ComboboxPrimitive.List>
        {loading && (
          // Not a row: no hover, no pick. Under the rows, so the items already here hold still while more arrive.
          <div
            role="status"
            className={cn(
              'flex shrink-0 items-center justify-center text-muted-foreground',
              size.control,
              size.itemPx,
              size.gap,
              size.text,
            )}
          >
            <LoaderIcon
              size={size.icon}
              strokeWidth={1.5}
              className="shrink-0 animate-spin motion-reduce:animate-none"
            />
            <span className="truncate text-trim">{loadingLabel}</span>
          </div>
        )}
      </ScrollArea>
    </ComboboxListContext.Provider>
  )
})

ComboboxList.displayName = 'ComboboxList'

interface ComboboxItemProps extends HTMLAttributes<HTMLDivElement> {
  /** Leading icon in the row. */
  icon?: IconComponent
  /** The item's value — a string item itself, or an object item's `value`. */
  value: string
  /** Disables the row. Defaults to `false`. */
  disabled?: boolean
  /** The row label. */
  children?: ReactNode
}

export const ComboboxItem = forwardRef<HTMLDivElement, ComboboxItemProps>(
  ({ className, children, icon: Icon, value, disabled = false, ...props }, ref) => {
    const combobox = useComboboxContext()
    const list = useContext(ComboboxListContext)
    const index = useContext(ComboboxItemIndexContext)
    const internalRef = useRef<HTMLDivElement>(null)
    const mergedRef = useMergeRefs(internalRef, ref)
    const size = useSize()

    useRegisterFluidHoverItem(list?.registerItem, index, internalRef)

    const isChecked = combobox.values.includes(value)
    const lit = list?.activeIndex === index || isChecked
    // Base UI matches rows to `items` by value, so the row hands back the item it was rendered from.
    const item = combobox.itemsByValue.get(value) ?? value

    const setChecked = list?.setChecked
    useEffect(() => {
      if (!isChecked || !setChecked) return
      setChecked(index, true)
      return () => setChecked(index, false)
    }, [isChecked, index, setChecked])

    return (
      <ComboboxPrimitive.Item
        value={item}
        index={index}
        disabled={disabled}
        render={
          <div
            ref={mergedRef}
            data-fluid-hover-index={index}
            className={cn(rowClasses({ size, shape: POPUP_SHAPE, lit, disabled }), className)}
            {...props}
          />
        }
      >
        {Icon && <RowIcon icon={Icon} lit={lit} />}
        <span className={rowLabelBoxClass(children)}>{children}</span>
        <CheckMark checked={isChecked} reserve />
      </ComboboxPrimitive.Item>
    )
  },
)

ComboboxItem.displayName = 'ComboboxItem'

interface ComboboxEmptyProps extends HTMLAttributes<HTMLDivElement> {
  /** Shown instead of the children when `hideSelected` has emptied the list with nothing typed: every item is a chip already. */
  allSelected?: ReactNode
  /** Shown when nothing matches the query. */
  children?: ReactNode
}

export const ComboboxEmpty = forwardRef<HTMLDivElement, ComboboxEmptyProps>(
  ({ className, children, allSelected, ...props }, ref) => {
    const size = useSize()
    const combobox = useComboboxContext()
    return (
      // A live region Base UI keeps mounted, rendering the children only while the list is empty.
      <ComboboxPrimitive.Empty
        ref={ref}
        className={cn('px-3 text-center text-muted-foreground [&:not(:empty)]:py-6', size.text, className)}
        {...props}
      >
        {combobox.loading ? null : combobox.allSelected && allSelected !== undefined ? allSelected : children}
      </ComboboxPrimitive.Empty>
    )
  },
)

ComboboxEmpty.displayName = 'ComboboxEmpty'

export type {
  ComboboxContentProps,
  ComboboxEmptyProps,
  ComboboxFooter,
  ComboboxFooterContext,
  ComboboxItemProps,
  ComboboxListProps,
}
