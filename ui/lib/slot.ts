/*
 * Local addition (not part of Fluid Functionalism): the trigger / close slot
 * shape FF's Dialog uses, shared by every overlay part that wraps a control.
 * Both spellings compose: `render={<Button/>}` (Base UI's composition API) or
 * Radix-style `asChild` with a single child element. `cloneSlot` / `mergeSlotProps` /
 * `composeRefs` are the other half: a wrapper clones its single child with its own props
 * merged in, as Radix's Slot does (the child's props win, handlers chain, `className`
 * joins, `style` merges, refs compose).
 */

import {
  type ButtonHTMLAttributes,
  type CSSProperties,
  cloneElement,
  isValidElement,
  type MutableRefObject,
  type ReactElement,
  type ReactNode,
  type Ref,
  version,
} from 'react'

interface SlotProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** The element that becomes the control, e.g. a Button. Children fill it when it has none of its own. */
  render?: ReactElement
  /** Compose onto the single child instead. Both spellings work in both flavors. Defaults to `false`. */
  asChild?: boolean
  /** Control content when there is no render element, or the content of a render element that has none of its own. */
  children?: ReactNode
  /** Whether the render element is a native `<button>`: pass `false` for a `<div>` or a link, so Base UI adds the button role and keyboard handling itself. Parts not built on a Base UI button ignore it. Defaults to `true`. */
  nativeButton?: boolean
}

/**
 * The element a slot part renders: `render`, or the single child with `asChild`, or undefined for the
 * part's own button. Base UI semantics: `children` fill a render element that has no children of its own
 * (`render={<div/>}` + children → the div gets them); a render element's own children win.
 */
function slotRender(render: ReactElement | undefined, asChild: boolean | undefined, children: ReactNode) {
  if (render) {
    const own = (render.props as { children?: ReactNode }).children
    return children === undefined || own !== undefined ? render : cloneElement(render, undefined, children)
  }
  return asChild && isValidElement(children) ? children : undefined
}

/** Calls every ref: callback refs with the node, object refs by assigning it. */
function composeRefs<T>(...refs: (Ref<T> | undefined | null)[]): (node: T | null) => void {
  return node => {
    for (const ref of refs) {
      if (typeof ref === 'function') ref(node)
      else if (ref) (ref as MutableRefObject<T | null>).current = node
    }
  }
}

/** A child's ref: React 19 keeps it in `props.ref`, React 18 on the element; each warns when read the other way. */
const REACT_19 = parseInt(version, 10) >= 19

function elementRef(element: ReactElement): Ref<unknown> | undefined {
  if (REACT_19) return (element.props as { ref?: Ref<unknown> }).ref
  return (element as { ref?: Ref<unknown> }).ref
}

/**
 * Props for a slotted child, with Radix Slot semantics: the child's props win,
 * `on*` handlers are chained (the child's first), `className` is joined and
 * `style` is merged (the child's declarations win).
 */
function mergeSlotProps(slotProps: Record<string, unknown>, childProps: Record<string, unknown>) {
  const merged: Record<string, unknown> = { ...slotProps, ...childProps }
  for (const key of Object.keys(childProps)) {
    const own = childProps[key]
    const given = slotProps[key]
    if (/^on[A-Z]/.test(key)) {
      if (typeof given !== 'function') continue
      if (typeof own === 'function') {
        merged[key] = (...args: unknown[]) => {
          own(...args)
          given(...args)
        }
      } else merged[key] = given
    } else if (key === 'style') {
      merged[key] = { ...(given as CSSProperties | undefined), ...(own as CSSProperties | undefined) }
    } else if (key === 'className') {
      merged[key] = [given, own].filter(Boolean).join(' ')
    }
  }
  return merged
}

/**
 * Clones `child` with the slot's props merged in (see `mergeSlotProps`) and the slot's ref composed
 * with the child's own, the way Radix's `Slot` composes onto its single child.
 */
function cloneSlot(child: ReactElement, slotProps: Record<string, unknown> = {}, slotRef?: Ref<unknown>) {
  const own = elementRef(child)
  const props = mergeSlotProps(slotProps, child.props as Record<string, unknown>)
  return cloneElement(child, slotRef || own ? { ...props, ref: composeRefs(slotRef, own) } : props)
}

export type { SlotProps }
export { cloneSlot, composeRefs, mergeSlotProps, slotRender }
