/*!
 * Part of the Fluid Functionalism dropdown port (`registry/base/dropdown.tsx`
 * @ b3587bdbd83fc66c2a6aae3817ffb856cb09260b, MIT © 2026 Micka Touillaud,
 * notice: LICENSE.fluid-functionalism). Local changes: see PORTING.md.
 */

'use client'

import {
  Children,
  cloneElement,
  isValidElement,
  type ReactElement,
  type ReactNode,
  useCallback,
  useMemo,
  useState,
} from 'react'
import { PopupSeparator } from '../../../lib/popup-rows'
import { useControllableState } from '../../../lib/use-controllable-state'
import { DropdownEmpty, type DropdownFilterContextValue, DropdownSearch } from './dropdown-search'
import { DropdownGroup, DropdownLabel, DropdownRadioGroup } from './menu-parts'

// `useControllableState` reads `undefined` as uncontrolled, so "nothing checked" needs a value of its own.
const NONE = -1
export const NO_INDICES: number[] = []

export interface PanelSelectionProps {
  /** The checked row: drives the selected background and the rows' radio semantics. */
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
}

/**
 * The panel's selection. Props and callbacks speak the authored index (what a
 * row was written with); the overlays and the row context speak the rendered
 * index (after a `Dropdown.Search filter` re-indexed the visible rows).
 */
export function usePanelSelection(
  {
    checkedIndex,
    defaultCheckedIndex,
    onCheckedIndexChange,
    checkedIndices,
    defaultCheckedIndices,
    onCheckedIndicesChange,
  }: PanelSelectionProps,
  sourceOf: number[],
  filtering: boolean,
) {
  const [single, setSingle] = useControllableState<number>(
    defaultCheckedIndex === undefined ? (checkedIndex ?? NONE) : undefined,
    defaultCheckedIndex ?? NONE,
    index => onCheckedIndexChange?.(index === NONE ? undefined : index),
  )
  const [many, setMany] = useControllableState<number[]>(
    defaultCheckedIndices === undefined ? (checkedIndices ?? NO_INDICES) : undefined,
    defaultCheckedIndices ?? NO_INDICES,
    indices => onCheckedIndicesChange?.(indices),
  )

  const multiple = checkedIndices != null || defaultCheckedIndices != null
  // Only a `default*` makes the panel answer for rows that brought no `checked` of their own.
  const selfManaged = defaultCheckedIndex !== undefined || defaultCheckedIndices !== undefined

  const toggleIndex = useCallback(
    (source: number) => {
      if (!multiple) return setSingle(source)
      setMany(prev =>
        prev.includes(source) ? prev.filter(i => i !== source) : [...prev, source].sort((a, b) => a - b),
      )
    },
    [multiple, setMany, setSingle],
  )

  const renderedIndex = useMemo(() => {
    if (single === NONE) return undefined
    const i = filtering ? sourceOf.indexOf(single) : single
    return i === -1 ? undefined : i
  }, [single, filtering, sourceOf])

  const renderedIndices = useMemo(() => {
    if (!multiple) return undefined
    if (!filtering) return many
    return many.map(s => sourceOf.indexOf(s)).filter(i => i !== -1)
  }, [multiple, many, filtering, sourceOf])

  return { checkedIndex: renderedIndex, checkedIndices: renderedIndices, multiple, selfManaged, toggleIndex }
}

/** The rows a `Dropdown.CheckboxItem` / `Dropdown.RadioItem` reports checked, for the merged selection background. */
export function useValueChecked() {
  const [valueChecked, setValueChecked] = useState(NO_INDICES)
  const reportChecked = useCallback(
    (index: number, on: boolean) =>
      setValueChecked(prev =>
        on === prev.includes(index) ? prev : on ? [...prev, index] : prev.filter(i => i !== index),
      ),
    [],
  )
  return { valueChecked, reportChecked }
}

/** The rows checked by index and by value: what the merged selection backgrounds cover. */
export function useCheckedRows(checkedIndices: number[] | undefined, valueChecked: number[]) {
  return useMemo(
    () => (valueChecked.length === 0 ? (checkedIndices ?? NO_INDICES) : [...(checkedIndices ?? []), ...valueChecked]),
    [checkedIndices, valueChecked],
  )
}

const NOT_ROWS = new Set<unknown>([
  DropdownLabel,
  PopupSeparator,
  DropdownSearch,
  DropdownEmpty,
  DropdownGroup,
  DropdownRadioGroup,
])

/** Every element child but the panel's captions, rules, groups, search and empty state takes a row index. */
const isPanelRow = (child: ReactElement) => !NOT_ROWS.has(child.type)

interface PanelRows {
  /** The rows re-indexed, with `Dropdown.Empty` only when nothing matched; the children untouched when nothing filters. */
  content: ReactNode
  /** Rendered index → authored index. Empty while nothing filters. */
  sourceOf: number[]
  filtering: boolean
  /** The query for a `Dropdown.Search filter`, or null. */
  filterCtx: DropdownFilterContextValue | null
}

/**
 * Rows that bring no `index` number themselves in document order
 * (`lib/row-order.tsx`, provided by the panel).
 *
 * Uncontrolled search: a `Dropdown.Search filter` among the panel's direct
 * children hands it the query. The panel keeps the direct rows with a text
 * (`textValue`, else `label`, else string `children`) that contains it,
 * re-indexes them from 0 for the fluid hover and stamps each with its
 * authored index (its `index`, else its position) as `sourceIndex`.
 */
export function usePanelRows(children: ReactNode): PanelRows {
  const [query, setQuery] = useState('')

  const filtering = useMemo(
    () =>
      Children.toArray(children).some(
        child => isValidElement(child) && child.type === DropdownSearch && (child.props as { filter?: boolean }).filter,
      ),
    [children],
  )

  const filterCtx = useMemo(() => ({ query, setQuery }), [query])

  const { content, sourceOf } = useMemo(() => {
    if (!filtering) return { content: children, sourceOf: NO_INDICES }
    const needle = query.trim().toLowerCase()
    const rendered: ReactNode[] = []
    const empties: ReactNode[] = []
    const sources: number[] = []
    let position = 0
    for (const child of Children.toArray(children)) {
      if (!isValidElement(child)) {
        rendered.push(child)
        continue
      }

      if (child.type === DropdownEmpty) {
        empties.push(child)
        continue
      }

      const row = child.props as { textValue?: unknown; label?: unknown; children?: unknown; index?: unknown }
      const authored = typeof row.index === 'number' ? row.index : position
      if (!isPanelRow(child)) {
        rendered.push(child)
        continue
      }

      position++
      const text = [row.textValue, row.label, row.children].find(t => typeof t === 'string') as string | undefined
      if (text === undefined) {
        rendered.push(child)
        continue
      }

      if (needle && !text.toLowerCase().includes(needle)) continue
      rendered.push(
        cloneElement(child as ReactElement<Record<string, unknown>>, { index: sources.length, sourceIndex: authored }),
      )
      sources.push(authored)
    }
    if (sources.length === 0) rendered.push(...empties)
    return { content: rendered as ReactNode, sourceOf: sources }
  }, [children, filtering, query])

  return { content, sourceOf, filtering, filterCtx: filtering ? filterCtx : null }
}
