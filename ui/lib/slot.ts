/*
 * Local addition (not part of Fluid Functionalism): the trigger / close slot
 * shape FF's Dialog uses, shared by every overlay part that wraps a control.
 * Both spellings compose: `render={<Button/>}` (Base UI's composition API) or
 * Radix-style `asChild` with a single child element.
 */

import { type ButtonHTMLAttributes, cloneElement, isValidElement, type ReactElement, type ReactNode } from 'react'

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

export type { SlotProps }
export { slotRender }
