/*!
 * Ported from Fluid Functionalism — github.com/mickadesign/fluid-functionalism
 * `registry/base/accordion.tsx` @ b3587bdbd83fc66c2a6aae3817ffb856cb09260b
 * MIT License © 2026 Micka Touillaud — fluidfunctionalism.com (notice: LICENSE.fluid-functionalism)
 * Local changes: see PORTING.md.
 */

'use client'

import { createContext, type MutableRefObject, useContext, useMemo } from 'react'
import { useControllableState } from '../../lib/use-controllable-state'
import type { ItemRect } from '../../lib/use-fluid-hover'

type AccordionHighlight = 'trigger' | 'item'

interface AccordionSingleProps {
  type?: 'single'
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  collapsible?: boolean
}

interface AccordionMultipleProps {
  type: 'multiple'
  value?: string[]
  defaultValue?: string[]
  onValueChange?: (value: string[]) => void
  collapsible?: never
}

/** The value props both roots take: one open item, or several. */
type AccordionValueProps = AccordionSingleProps | AccordionMultipleProps

const NONE: string[] = []

/**
 * Both roots' state, in Base UI's shape (`value: string[]`, `multiple`): one
 * open value in single mode, the list in multiple mode. Single mode refuses to
 * close its open item when `collapsible` is `false`.
 */
function useAccordionValue(props: AccordionValueProps) {
  const single = props.type === 'multiple' ? undefined : props
  const multiple = props.type === 'multiple' ? props : undefined
  const [one, setOne] = useControllableState(single?.value, single?.defaultValue ?? '', single?.onValueChange)
  const [many, setMany] = useControllableState(multiple?.value, multiple?.defaultValue ?? NONE, multiple?.onValueChange)

  const list = multiple ? many : one ? [one] : NONE
  const key = list.join('\n')
  // Keyed on the values, not the fresh array.
  const open = useMemo(() => list, [key])

  const onValueChange = (next: string[]) => {
    if (multiple) return setMany(next)
    if (next.length === 0 && single?.collapsible === false) return
    setOne(next[0] ?? '')
  }

  return { open, key, onValueChange, multiple: !!multiple }
}

/** Strips the value props, leaving what goes on the root element. */
function htmlProps<P extends AccordionValueProps>({
  type: _type,
  value: _value,
  defaultValue: _defaultValue,
  onValueChange: _onValueChange,
  collapsible: _collapsible,
  ...rest
}: P) {
  return rest
}

interface AccordionGroupContextValue {
  registerItem: (index: number, element: HTMLElement | null) => void
  registerFullItem: (index: number, element: HTMLElement | null) => void
  activeIndex: number | null
  remeasure: () => void
  openValues: Set<string>
  openItemRects: Map<number, ItemRect>
  /** The group's choice; its items draw the `"item"` tint themselves. */
  highlight: AccordionHighlight
  /** A closed row is hovered: open tints step back. */
  dimOpen: boolean
}

const AccordionGroupContext = createContext<AccordionGroupContextValue | null>(null)

/** A standalone root's open values and highlight. */
const StandaloneContext = createContext<{ open: Set<string>; highlight?: AccordionHighlight }>({ open: new Set() })

interface AccordionItemContextValue {
  index?: number
  value: string
  isOpen: boolean
  triggerRef: MutableRefObject<HTMLDivElement | null>
  highlight: AccordionHighlight
  /** Where the row was last pressed, in px from its left edge; the panel grows from there. */
  press: MutableRefObject<number | null>
}

const AccordionItemContext = createContext<AccordionItemContextValue | null>(null)

function useAccordionItem() {
  const ctx = useContext(AccordionItemContext)
  if (!ctx) throw new Error('Accordion.Trigger and Accordion.Content must be used within an Accordion.Item')
  return ctx
}

export type { AccordionGroupContextValue, AccordionHighlight, AccordionItemContextValue, AccordionValueProps }
export {
  AccordionGroupContext,
  AccordionItemContext,
  htmlProps,
  StandaloneContext,
  useAccordionItem,
  useAccordionValue,
}
