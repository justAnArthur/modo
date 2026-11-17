/*
 * Local addition (not part of Fluid Functionalism): the `render` / `asChild`
 * slot shape. Both spellings compose: `render={<Button/>}` (Base UI's
 * composition API) or Radix-style `asChild` with a single child element.
 * `slotRender` and `slotPart` hand the element to a Base UI part, which
 * merges the props itself; `slotElement` (from FF's sidebar) merges them for
 * a plain element.
 */

'use client'

import {
  type ButtonHTMLAttributes,
  Children,
  type CSSProperties,
  cloneElement,
  type ElementType,
  forwardRef,
  isValidElement,
  type ReactElement,
  type ReactNode,
  type Ref,
} from 'react'
import { mergeRefs } from './merge-refs'
import { cn } from './utils'

interface SlotProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** The element that becomes the control, e.g. a Button. */
  render?: ReactElement
  /** Compose onto the single child instead. Defaults to `false`. */
  asChild?: boolean
  /** Control content when there is no render element. */
  children?: ReactNode
}

/** The element a Base UI part renders as: `render`, else `asChild`'s child, else none. */
function slotRender(render: ReactElement | undefined, asChild: boolean | undefined, children: ReactNode) {
  if (render) return render
  return asChild && isValidElement(children) ? children : undefined
}

/**
 * Wraps a Base UI trigger or close part so it takes `SlotProps`:
 * `const PopoverTrigger = slotPart<PopoverTriggerProps>(Popover.Trigger, 'PopoverTrigger')`.
 * `P` is the wrapper's own props (`SlotProps` plus what the part adds).
 */
function slotPart<P extends SlotProps = SlotProps>(Part: ElementType, displayName: string) {
  const Slotted = forwardRef<HTMLButtonElement, P>(({ render, asChild, children, ...props }, ref) => {
    const el = slotRender(render, asChild, children)
    return el ? (
      <Part ref={ref} render={el} {...props} />
    ) : (
      <Part ref={ref} {...props}>
        {children}
      </Part>
    )
  })
  Slotted.displayName = displayName
  return Slotted
}

type TemplateProps = {
  className?: string
  style?: CSSProperties
  children?: ReactNode
} & Record<string, unknown>

/**
 * The element to clone for a plain (non-Base UI) slot: `render` wins, else
 * `asChild`'s single element child. `content` is what renders inside it: the
 * child's own children for `asChild`, otherwise `children`.
 */
function resolveSlotTemplate(
  render: ReactElement | undefined,
  asChild: boolean | undefined,
  children: ReactNode,
): { template: ReactElement<TemplateProps> | null; content: ReactNode } {
  if (render && isValidElement(render)) return { template: render as ReactElement<TemplateProps>, content: children }
  if (asChild) {
    const only = Children.toArray(children)[0]
    if (isValidElement(only)) {
      return { template: only as ReactElement<TemplateProps>, content: (only.props as TemplateProps).children }
    }
  }
  return { template: null, content: children }
}

/**
 * Renders `content` into the template (from `resolveSlotTemplate`), merging
 * classes and styles, chaining handlers (the template's first) and merging
 * refs; or into `DefaultTag` when there is no template. Without `content`
 * the element keeps its own children.
 */
function slotElement(
  template: ReactElement<TemplateProps> | null,
  DefaultTag: ElementType,
  props: TemplateProps & { ref?: Ref<HTMLElement> },
  content: ReactNode,
): ReactElement {
  // No `content`, no `children` key: a Base UI part fills a render element only when it brings none.
  if (!template)
    return content === undefined ? <DefaultTag {...props} /> : <DefaultTag {...props}>{content}</DefaultTag>

  const own = template.props
  const merged: TemplateProps & { ref?: Ref<HTMLElement> } = {
    ...props,
    ...own,
    className: cn(props.className, own.className),
    style: { ...props.style, ...(own.style as CSSProperties | undefined) },
  }
  for (const key of Object.keys(props)) {
    if (!/^on[A-Z]/.test(key)) continue
    const ours = props[key]
    const theirs = own[key]
    if (typeof ours !== 'function' || typeof theirs !== 'function') continue
    merged[key] = (...args: unknown[]) => {
      theirs(...args)
      ours(...args)
    }
  }
  const templateRef = (own as { ref?: Ref<HTMLElement> }).ref ?? (template as unknown as { ref?: Ref<HTMLElement> }).ref
  merged.ref = mergeRefs(props.ref, templateRef)
  return content === undefined ? cloneElement(template, merged) : cloneElement(template, merged, content)
}

/**
 * Clones `child` with `slotProps` merged in, as Radix's `Slot` composes onto its single child: the
 * child's props win, handlers chain (the child's first), classes join, styles merge, and `ref`
 * composes with the child's own. `slotElement` with the child as its template.
 */
function cloneSlot(child: ReactElement, slotProps: Record<string, unknown> = {}, ref?: Ref<HTMLElement>) {
  const template = child as ReactElement<TemplateProps>
  return slotElement(template, 'div', { ...slotProps, ref }, template.props.children)
}

export type { SlotProps }
export { cloneSlot, resolveSlotTemplate, slotElement, slotPart, slotRender }
