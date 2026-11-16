/*!
 * Ported from Fluid Functionalism — github.com/mickadesign/fluid-functionalism
 * `registry/base/combobox.tsx` @ b3587bdbd83fc66c2a6aae3817ffb856cb09260b
 * MIT License © 2026 Micka Touillaud — fluidfunctionalism.com (notice: LICENSE.fluid-functionalism)
 * Local changes: see PORTING.md.
 */

'use client'

import { Combobox as ComboboxPrimitive } from '@base-ui/react/combobox'
import { type ReactNode, useCallback, useMemo, useRef, useState } from 'react'
import { useFieldState } from '../../../lib/field-box'
import { OverlayContext, useOverlayRoot } from '../../../lib/overlay'
import type { SizeVariant } from '../../../lib/size-context'
import { useControllableState } from '../../../lib/use-controllable-state'
import { SizeScope } from '../../../primitives/sizes'
import {
  ComboboxContext,
  ComboboxHighlightContext,
  type ComboboxItemData,
  type ComboboxItemObject,
  type ComboboxValue,
  CREATE_VALUE,
  type Highlight,
  isCreateItem,
  itemLabel,
  itemValue,
} from './context'
import { ComboboxChips, type ComboboxChipsProps, ComboboxInput, type ComboboxInputProps } from './fields'
import {
  ComboboxContent,
  type ComboboxContentProps,
  ComboboxEmpty,
  type ComboboxEmptyProps,
  type ComboboxFooter,
  type ComboboxFooterContext,
  ComboboxItem,
  type ComboboxItemProps,
  ComboboxList,
  type ComboboxListProps,
} from './list'

// The first row is highlighted on open and follows the query, so Enter always
// has a target. AriaCombobox accepts "always"; ComboboxRoot's prop type says boolean.
const ALWAYS_HIGHLIGHT = 'always' as unknown as boolean

function defaultCreateLabel(query: string): ReactNode {
  return `Create “${query}”`
}

function toValues(v: string | readonly string[] | undefined): string[] {
  if (v === undefined) return []
  if (Array.isArray(v)) return v as string[]
  return v === '' ? [] : [v as string]
}

interface ComboboxProps {
  /** `Combobox.Input` or `Combobox.Chips`, plus `Combobox.Content`. */
  children: ReactNode
  /** The options. A string is its own value and label; an object carries `value`, `label`, and whatever your rows need. */
  items: readonly ComboboxItemData[]
  /** Any number of picks. Values become `string[]`; use `Combobox.Chips` for the field. Defaults to `false`. */
  multiple?: boolean
  /** Selected value. `""` means none; an array when `multiple`. Controlled — pair it with `onValueChange`. */
  value?: string | string[]
  /** Selection on first render when uncontrolled. Defaults to none. */
  defaultValue?: string | string[]
  /** Called with the pick, `""` when cleared, or the array when `multiple`. */
  onValueChange?: ((value: string) => void) | ((value: string[]) => void)
  /** Controlled open state. Pair with `onOpenChange`. */
  open?: boolean
  /** Initial open state, for an uncontrolled combobox. Defaults to `false`. */
  defaultOpen?: boolean
  /** Called when the list opens or closes. */
  onOpenChange?: (open: boolean) => void
  /** Match an item against the query, or `null` to show every item as given (filtered elsewhere, e.g. on a server). Defaults to a case-insensitive "contains" on the label. */
  filter?: ((item: ComboboxItemData, query: string) => boolean) | null
  /** Controlled query, the field's text. Pair with `onQueryChange`. */
  query?: string
  /** Initial query, for an uncontrolled field. Defaults to `""`. */
  defaultQuery?: string
  /** Called with the field's text on every keystroke, and when a pick, a clear or a close rewrites it. */
  onQueryChange?: (query: string) => void
  /** Items are on their way: the chevron turns into a spinner, a status row is pinned under the scrolling rows (announced, in sight however long the list) and the empty message waits. Defaults to `false`. */
  loading?: boolean
  /** The loading row's text. Defaults to `"Loading…"`. */
  loadingLabel?: ReactNode
  /** Shows the picks but takes no input: the popup stays shut and the clear ✕ and chip ✕ go. Defaults to `false`. */
  readOnly?: boolean
  /** Adds a last row that creates the trimmed query whenever no label matches it exactly. Add the item to `items` and return it to select it. */
  // biome-ignore lint/suspicious/noConfusingVoidType: upstream API; a callback may return nothing.
  onCreate?: (query: string) => ComboboxItemData | void
  /** The create row's label. Defaults to ``(query) => `Create “${query}”` ``. */
  createLabel?: (query: string) => ReactNode
  /** Offer the create row with no callback — the component keeps the items it makes, so nothing outside has to hold the list. Defaults to `false`. */
  creatable?: boolean
  /** Multiple only. Picked items leave the list, so it reads as what is left to add. Deselect from the chips. Defaults to `false`. */
  hideSelected?: boolean
  /** Disables the field and the popup. Defaults to `false`. */
  disabled?: boolean
  /** Form field name; a hidden input carries the value. */
  name?: string
  /** Marks the hidden form input required. */
  required?: boolean
  /** Pins field and popup to one step of the size ladder (default 36px, compact 28px — see the Sizes primitive). Omitted, both follow the surrounding SizeProvider. */
  size?: SizeVariant
}

/**
 * Type to filter a list. 1 pick, or chips.
 *
 * Items are data on the root: strings, which are their own value and label,
 * or `{ value, label, … }` objects. `Combobox.List` takes a function child and
 * renders one `Combobox.Item` per match, so the filtering, the ARIA wiring
 * (the input keeps focus while the arrows move a highlight through the rows),
 * the positioning and the hidden form input stay with Base UI. On top of that
 * sit Select's rows — the fluid-hover highlight, a selected background that
 * melts between rows, the drawn check — the merged selection background of
 * `Checkbox.Group` in multiple mode, and a list that oozes out of the field and
 * back through the shared morph (see Morph), goo by default. `multiple` turns
 * the picks into a `string[]` and pairs with `Combobox.Chips`: one chip per
 * pick, Backspace in an empty field drops the last one. Uncontrolled with
 * `defaultValue` and `defaultOpen`, or controlled with `value` plus
 * `onValueChange` and `open` plus `onOpenChange`.
 *
 * For items that come from elsewhere (a server, a paged API), own the query
 * with `query` + `onQueryChange`, pass `filter={null}` so the list shows
 * exactly the items you hand it, and set `loading` while they are on their
 * way: the chevron blurs into a spinner and a status row, pinned under the
 * scrolling rows so a long stale list can't hide it, stands in for the empty
 * message. `Combobox.Content`'s `footer` pins an action under the list ("Load
 * more", "Add new…"); a press on it leaves focus and the caret in the input,
 * and Tab still reaches it from the keyboard. `readOnly` shows the picks and
 * takes no input. A row's label may be any node (an avatar and a name); it
 * keeps its own box, where text is trimmed and truncated.
 *
 * Statics:
 * - `Combobox.Input` — the single-pick field: icon, text input, clear ✕, chevron.
 * - `Combobox.Chips` — the multiple field: one chip per pick ahead of the input.
 * - `Combobox.Content` — the popup surface, holding `Combobox.Empty` and `Combobox.List`:
 *   `side`, `align`, `sideOffset`, `container`, a `footer` under the list, and the morph options
 *   `from`, `effect`, `hideSource`, `tier`.
 * - `Combobox.List` — a row per match, from a `(item, index) => ReactNode` child.
 * - `Combobox.Item` — one row: `value`, optional `icon` and `disabled`.
 * - `Combobox.Empty` — what shows when nothing matches.
 *
 * @example {@include ./examples.mdx}
 * @source https://github.com/mickadesign/fluid-functionalism/blob/b3587bdbd83fc66c2a6aae3817ffb856cb09260b/registry/base/combobox.tsx Fluid Functionalism
 * @license MIT © 2026 Micka Touillaud
 */
const Combobox = Object.assign(
  function Combobox({
    children,
    items,
    multiple,
    value,
    defaultValue,
    onValueChange,
    open,
    defaultOpen,
    onOpenChange,
    filter,
    query: queryProp,
    defaultQuery = '',
    onQueryChange,
    loading = false,
    loadingLabel = 'Loading…',
    readOnly: readOnlyProp,
    onCreate,
    createLabel = defaultCreateLabel,
    creatable = false,
    hideSelected = false,
    disabled: disabledProp,
    name,
    required: requiredProp,
    size,
  }: ComboboxProps) {
    const { disabled, readOnly, required } = useFieldState({
      disabled: disabledProp,
      readOnly: readOnlyProp,
      required: requiredProp,
    })
    const isMultiple = !!multiple
    // Memoized on the prop: a consumer's array is state, so everything keyed on it changes only with the selection.
    const controlledValues = useMemo(() => (value === undefined ? undefined : toValues(value)), [value])
    const [values, setValues] = useControllableState<string[]>(controlledValues, toValues(defaultValue))
    // Base UI owns the field's text unless the caller does; this mirrors it either way.
    const [inputValue, setInputValue] = useControllableState(queryProp, defaultQuery, onQueryChange)
    const [highlight, setHighlight] = useState<Highlight | null>(null)
    // Items the create row made while no consumer owns the list.
    const [createdItems, setCreatedItems] = useState<ComboboxItemData[]>([])
    const root = useOverlayRoot({ open, defaultOpen, onOpenChange })
    const anchorRef = useRef<HTMLDivElement | null>(null)

    // A consumer that adds a created item to `items` itself wins: the internal copy is deduped away.
    const allItems = useMemo<readonly ComboboxItemData[]>(() => {
      const own = createdItems.filter(made => !items.some(item => itemValue(item) === itemValue(made)))
      return own.length ? [...items, ...own] : items
    }, [items, createdItems])

    // A single field shows the picked label on open, an exact match, so no create row until the user types past it.
    const query = inputValue.trim()
    const canCreate = !!onCreate || creatable
    const createItem = useMemo<ComboboxItemData | null>(() => {
      if (!canCreate || query === '') return null
      const lower = query.toLocaleLowerCase()
      const exists = allItems.some(item => itemLabel(item).toLocaleLowerCase() === lower)
      return exists ? null : { value: CREATE_VALUE, label: query }
    }, [canCreate, query, allItems])

    const itemsByValue = useMemo(() => {
      const map = new Map<string, ComboboxItemData>()
      for (const item of allItems) map.set(itemValue(item), item)
      if (createItem) map.set(CREATE_VALUE, createItem)
      return map
    }, [allItems, createItem])
    const selectedItems = useMemo(
      () => values.map(v => itemsByValue.get(v)).filter(Boolean) as ComboboxItemData[],
      [values, itemsByValue],
    )

    // The create row goes last, so Enter picks a real match while one exists.
    const hideChecked = hideSelected && isMultiple
    const listItems = useMemo<readonly ComboboxItemData[]>(() => {
      const visible = hideChecked ? allItems.filter(item => !values.includes(itemValue(item))) : allItems
      return createItem ? [...visible, createItem] : visible
    }, [allItems, hideChecked, values, createItem])
    const allSelected = hideChecked && query === '' && allItems.length > 0 && listItems.length === 0

    // A pick on the create row is not a selection: it asks for the item and selects what comes back.
    const onCreateRef = useRef(onCreate)
    onCreateRef.current = onCreate
    const handleValueChange = useCallback(
      (next: ComboboxItemData[] | ComboboxItemData | null) => {
        const picked = Array.isArray(next) ? next : next == null ? [] : [next]
        const created = picked.find(isCreateItem)
        let nextValues = picked.filter(item => !isCreateItem(item)).map(itemValue)
        if (created) {
          const madeQuery = itemLabel(created)
          const made = onCreateRef.current?.(madeQuery) ?? undefined
          if (made !== undefined) {
            nextValues = [...nextValues, itemValue(made)]
          } else if (creatable) {
            const own: ComboboxItemData = { value: madeQuery, label: madeQuery }
            setCreatedItems(prev => (prev.some(item => itemValue(item) === madeQuery) ? prev : [...prev, own]))
            nextValues = [...nextValues, madeQuery]
          } else if (!isMultiple) {
            return
          }
        }
        setValues(nextValues)
        ;(onValueChange as ((value: string | string[]) => void) | undefined)?.(
          isMultiple ? nextValues : (nextValues[0] ?? ''),
        )
      },
      [onValueChange, isMultiple, creatable, setValues],
    )

    // The create row survives the filter that hides every other miss.
    const { contains } = ComboboxPrimitive.useFilter()
    const filterFn = useMemo(() => {
      if (filter === null) return null
      if (!filter && !createItem) return undefined
      const match = filter
        ? (item: ComboboxItemData, q: string) => filter(item, q)
        : (item: ComboboxItemData, q: string) => contains(item, q, itemLabel)
      return (item: ComboboxItemData, q: string) => isCreateItem(item) || match(item, q)
    }, [filter, createItem, contains])

    const createRow = createItem ? createLabel(query) : null
    const { setOpen } = root
    const close = useCallback(() => setOpen(false), [setOpen])
    const ctx = useMemo(
      () => ({
        values,
        multiple: isMultiple,
        inputValue,
        anchorRef,
        disabled,
        itemsByValue,
        createRow,
        allSelected,
        loading,
        loadingLabel,
        readOnly,
        close,
      }),
      [
        values,
        isMultiple,
        inputValue,
        disabled,
        itemsByValue,
        createRow,
        allSelected,
        loading,
        loadingLabel,
        readOnly,
        close,
      ],
    )

    return (
      <SizeScope size={size}>
        <ComboboxContext.Provider value={ctx}>
          <OverlayContext.Provider value={root.state}>
            <ComboboxHighlightContext.Provider value={highlight}>
              {/* Non-modal: the page keeps scrolling and the popup follows its field. */}
              <ComboboxPrimitive.Root
                items={listItems}
                multiple={isMultiple}
                // "" maps to Base UI's null. The value's shape follows `multiple`, which the generics can't express.
                value={(isMultiple ? selectedItems : (selectedItems[0] ?? null)) as never}
                onValueChange={handleValueChange as never}
                isItemEqualToValue={(a: ComboboxItemData, b: ComboboxItemData) => itemValue(a) === itemValue(b)}
                itemToStringLabel={itemLabel}
                itemToStringValue={itemValue}
                filter={filterFn}
                open={root.open}
                // The list grows out of the field, whichever part opened it.
                onOpenChange={(next, details) =>
                  root.onOpenChange(next, { event: details.event, trigger: anchorRef.current ?? undefined })
                }
                inputValue={queryProp}
                defaultInputValue={defaultQuery}
                onInputValueChange={next => setInputValue(next)}
                autoHighlight={ALWAYS_HIGHLIGHT}
                onItemHighlighted={(item, details) =>
                  setHighlight(
                    item === undefined ? null : { index: details.index, keyboard: details.reason !== 'pointer' },
                  )
                }
                disabled={disabled}
                readOnly={readOnly}
                name={name}
                required={required}
                modal={false}
              >
                {children}
              </ComboboxPrimitive.Root>
            </ComboboxHighlightContext.Provider>
          </OverlayContext.Provider>
        </ComboboxContext.Provider>
      </SizeScope>
    )
  },
  {
    Input: ComboboxInput,
    Chips: ComboboxChips,
    Content: ComboboxContent,
    List: ComboboxList,
    Item: ComboboxItem,
    Empty: ComboboxEmpty,
  },
)

export type {
  ComboboxChipsProps,
  ComboboxContentProps,
  ComboboxEmptyProps,
  ComboboxFooter,
  ComboboxFooterContext,
  ComboboxInputProps,
  ComboboxItemData,
  ComboboxItemObject,
  ComboboxItemProps,
  ComboboxListProps,
  ComboboxProps,
  ComboboxValue,
}
export { Combobox, ComboboxChips, ComboboxContent, ComboboxEmpty, ComboboxInput, ComboboxItem, ComboboxList }

export default Combobox
