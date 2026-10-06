/*
 * Local addition (not part of Fluid Functionalism): the trigger / close slot
 * shape FF's Dialog uses, shared by every overlay part that wraps a control.
 * Both spellings compose: `render={<Button/>}` (Base UI's composition API) or
 * Radix-style `asChild` with a single child element.
 */

import { type ButtonHTMLAttributes, isValidElement, type ReactElement, type ReactNode } from 'react'

interface SlotProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** The element that becomes the control, e.g. a Button. */
  render?: ReactElement
  /** Compose onto the single child instead. Both spellings work in both flavors. Defaults to `false`. */
  asChild?: boolean
  /** Control content when there is no render element. */
  children?: ReactNode
}

function slotRender(render: ReactElement | undefined, asChild: boolean | undefined, children: ReactNode) {
  if (render) return render
  return asChild && isValidElement(children) ? (children as ReactElement) : undefined
}

export type { SlotProps }
export { slotRender }
