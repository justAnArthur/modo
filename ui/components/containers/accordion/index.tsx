/*!
 * Ported from Fluid Functionalism — github.com/mickadesign/fluid-functionalism
 * `registry/base/accordion.tsx` @ b3587bdbd83fc66c2a6aae3817ffb856cb09260b
 * MIT License © 2026 Micka Touillaud — fluidfunctionalism.com (notice: LICENSE.fluid-functionalism)
 * Local changes: see PORTING.md.
 */

'use client'

import { Accordion as AccordionPrimitive } from '@base-ui/react/accordion'
import { AnimatePresence, motion } from 'motion/react'
import {
  type ForwardRefExoticComponent,
  forwardRef,
  type HTMLAttributes,
  isValidElement,
  type PointerEvent,
  type ReactNode,
  type Ref,
  type RefAttributes,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { type IconComponent, useIcon } from '../../../lib/icon-context'
import { mergeRefs } from '../../../lib/merge-refs'
import { useRowPosition } from '../../../lib/row-index'
import { useShape } from '../../../lib/shape-context'
import { type SizeVariant, useSize } from '../../../lib/size-context'
import { type SlotProps, slotRender } from '../../../lib/slot'
import { spring } from '../../../lib/springs'
import { useRegisterFluidHoverItem } from '../../../lib/use-fluid-hover'
import { cn } from '../../../lib/utils'
import { WeightLabel } from '../../../lib/weight-label'
import { SizeScope } from '../../../primitives/systems/sizes'
import { AccordionContent } from './accordion-content'
import {
  AccordionGroupContext,
  type AccordionHighlight,
  AccordionItemContext,
  type AccordionValueProps,
  htmlProps,
  StandaloneContext,
  useAccordionItem,
  useAccordionValue,
} from './accordion-context'
import { AccordionGroup } from './accordion-group'

// The literal is what the docs list; the union narrows `value` and `onValueChange` per `type`.
type AccordionProps = {
  /** The accordion's items (`Accordion.Item`). */
  children: ReactNode
  /** Whether one or multiple items can be expanded. Defaults to `"single"`. */
  type?: 'single' | 'multiple'
  /** In single mode, whether the open item closes when its row is pressed again; `false` keeps one item open. Defaults to `true`. */
  collapsible?: boolean
  /** Initially expanded item value — uncontrolled. A string for `type="single"`, an array for `type="multiple"`. */
  defaultValue?: string | string[]
  /** Controlled expanded value. A string for `type="single"`, an array for `type="multiple"`. */
  value?: string | string[]
  /** Called when the expanded value changes, with a string in single mode and an array in multiple mode. */
  onValueChange?: ((value: string) => void) | ((value: string[]) => void)
  /** What an open item tints: `item` holds a block across the row and its panel, `trigger` scopes it to the row and shows it on hover. Same prop on `Accordion.Group` and on a standalone `Accordion.Item`. Defaults to `"item"`. */
  highlight?: AccordionHighlight
  /** Pins the accordion's rows to one step of the size ladder (default 36px, compact 28px). Omitted, they follow the surrounding SizeProvider. */
  size?: SizeVariant
} & Omit<HTMLAttributes<HTMLDivElement>, 'defaultValue'> &
  AccordionValueProps

type AccordionComponent = ForwardRefExoticComponent<AccordionProps & RefAttributes<HTMLDivElement>> & {
  Group: typeof AccordionGroup
  Item: typeof AccordionItem
  Trigger: typeof AccordionTrigger
  Content: typeof AccordionContent
}

/**
 * Collapsible sections with animated expand/collapse and fluid hover in
 * grouped mode.
 *
 * Accordion is the standalone form: every row carries its own hover fill.
 * Accordion.Group takes the same props and adds one magnetic highlight that
 * glides between rows; it numbers its items itself. Built on Base UI
 * Accordion (WAI-ARIA wiring, keyboard navigation, focus management).
 * Uncontrolled through `defaultValue`, controlled through `value` +
 * `onValueChange`. Both roots fill their container's width.
 *
 * The panel grows out of its row (see Morph): a shape drips from where the
 * row was pressed (its middle, from the keyboard), widens into the whole
 * item, and the content is revealed by a clip from the same shape. Under the
 * default `highlight="item"` that shape is the open tint, melted into the
 * row through a liquid goo neck; closing folds it back into the row. The
 * rows below ride the shape's bottom edge, so nothing jumps.
 *
 * Statics:
 * - `Accordion.Group` — the grouped root: the same `type`, `collapsible`, `value`, `defaultValue`, `onValueChange`, `highlight` and `size`.
 * - `Accordion.Item` — `value`, `disabled`, and `index` to override its place in a group.
 * - `Accordion.Trigger` — the row that toggles its item: `icon` swaps or hides the chevron, `weightShift={false}` renders a rich label once, `render` / `asChild` make your own element the whole trigger (`nativeButton={false}` for a non-button).
 * - `Accordion.Content` — the collapsible panel: `effect` (`'goo'` or a plain `'morph'`), the spring `tier` (`'slow'` or `'moderate'`) and `contentClassName` for the inner row.
 *
 * @example {@include ./examples.mdx}
 * @source https://github.com/mickadesign/fluid-functionalism/blob/b3587bdbd83fc66c2a6aae3817ffb856cb09260b/registry/base/accordion.tsx Fluid Functionalism
 * @license MIT © 2026 Micka Touillaud
 */
const Accordion = forwardRef<HTMLDivElement, AccordionProps>((props, ref) => {
  const { children, highlight, size, className, ...rest } = props
  const accordion = useAccordionValue(props)
  const standalone = useMemo(() => ({ open: new Set(accordion.open), highlight }), [accordion.open, highlight])

  return (
    <SizeScope size={size}>
      <AccordionPrimitive.Root
        value={accordion.open}
        onValueChange={accordion.onValueChange}
        multiple={accordion.multiple}
        render={rootProps => {
          const { style: _style, ...root } = rootProps as HTMLAttributes<HTMLDivElement>
          return (
            <div {...root} ref={ref} className={cn('flex flex-col', className)} {...htmlProps(rest)}>
              {/* Its own root even inside a group's panel, not one more row of that group. */}
              <AccordionGroupContext.Provider value={null}>
                <StandaloneContext.Provider value={standalone}>{children}</StandaloneContext.Provider>
              </AccordionGroupContext.Provider>
            </div>
          )
        }}
      />
    </SizeScope>
  )
}) as AccordionComponent

Accordion.displayName = 'Accordion'

interface AccordionItemProps extends HTMLAttributes<HTMLDivElement> {
  /** Unique identifier for this item. */
  value: string
  /** Its place in an `Accordion.Group`, for the fluid hover. Defaults to its position among the group's children. */
  index?: number
  /** Whether this item is disabled. Defaults to `false`. */
  disabled?: boolean
  /** Standalone equivalent of the group's prop: what an open item tints. Ignored inside a group, which decides for all its rows. Defaults to the standalone root's `highlight`, else `"item"`. */
  highlight?: AccordionHighlight
  /** The item's `Accordion.Trigger` and `Accordion.Content`. */
  children: ReactNode
}

const AccordionItem = forwardRef<HTMLDivElement, AccordionItemProps>(
  ({ value, index: indexProp, disabled, highlight: highlightProp, children, className, ...props }, ref) => {
    const internalRef = useRef<HTMLDivElement>(null)
    const group = useContext(AccordionGroupContext)
    const standalone = useContext(StandaloneContext)
    const position = useRowPosition()
    const index = indexProp ?? position
    const highlight = group ? group.highlight : (highlightProp ?? standalone.highlight ?? 'item')
    const isOpen = group ? group.openValues.has(value) : standalone.open.has(value)
    const triggerRef = useRef<HTMLDivElement>(null)
    const press = useRef<number | null>(null)

    useRegisterFluidHoverItem(group?.registerItem, index, triggerRef)

    const registerFullItem = group?.registerFullItem
    useEffect(() => {
      if (!registerFullItem || index === undefined) return
      registerFullItem(index, isOpen ? internalRef.current : null)
      return () => registerFullItem(index, null)
    }, [index, registerFullItem, isOpen])

    return (
      <AccordionItemContext.Provider value={{ index, value, isOpen, triggerRef, highlight, press }}>
        <AccordionPrimitive.Item
          // Through Base UI, which merges it with the list-item registration arrow keys read.
          ref={mergeRefs(internalRef, ref)}
          value={value}
          disabled={disabled}
          render={itemProps => {
            const { style: _style, ...item } = itemProps as HTMLAttributes<HTMLDivElement>
            return (
              // Positioned in a group too, so the open tint covers the whole item.
              <div {...item} data-fluid-hover-index={index} className={cn('relative', className)} {...props}>
                {children}
              </div>
            )
          }}
        />
      </AccordionItemContext.Provider>
    )
  },
)

AccordionItem.displayName = 'AccordionItem'

interface AccordionTriggerProps extends SlotProps {
  /** Trigger label content. With `render`, it fills that element when the element has no children of its own. */
  children?: ReactNode
  /** The glyph at the row's end, which turns a quarter turn when the item opens (so give it a right-pointing one), or `false` for none. Defaults to the icon context's `chevron-right`. */
  icon?: IconComponent | false
  /** Whether the label gets heavier while the item is open. On, a hidden semibold copy reserves the label's width; off, it renders once and keeps its content's own weight, for rich content that shouldn't be duplicated in the DOM. Defaults to `true`. */
  weightShift?: boolean
  /** Whether the `render` / `asChild` element is a native `<button>`: pass `false` for a `<div>`, so Base UI adds the button role and keyboard handling itself. Defaults to `true`. */
  nativeButton?: boolean
}

// Base UI tracks the trigger by the id it is given, so a slot element's own `id` must be that id.
const slotId = (el: unknown, id?: string) => {
  const own = isValidElement(el) ? (el.props as { id?: unknown }).id : undefined
  return typeof own === 'string' ? own : id
}

const AccordionTrigger = forwardRef<HTMLButtonElement, AccordionTriggerProps>(
  ({ children, className, icon, weightShift = true, render, asChild, nativeButton, ...props }, ref) => {
    const el = slotRender(render, asChild, children)
    const ChevronRight = useIcon('chevron-right')
    const Glyph = icon === false ? null : (icon ?? ChevronRight)
    const group = useContext(AccordionGroupContext)
    const { index, isOpen, triggerRef, highlight, press } = useAccordionItem()
    const shape = useShape()
    const sizeClasses = useSize()
    const [isHovered, setIsHovered] = useState(false)
    const isActive = group ? group.activeIndex === index : isHovered
    const lit = isOpen || isActive

    // In layout px, so a scaled ancestor doesn't move the source.
    const capture = (event: PointerEvent<HTMLDivElement>) => {
      const row = event.currentTarget
      const box = row.getBoundingClientRect()
      press.current = ((event.clientX - box.left) * row.offsetWidth) / box.width
    }

    const trigger = (
      // A <div>, not Base UI's default <h3>, which would break the styles' ancestor selectors.
      <AccordionPrimitive.Header render={<div />}>
        {el ? (
          // A slot element is the whole trigger, its own look included: no row padding, ring, label or glyph.
          // Base UI fills a `render` element that has no children of its own with the part's children.
          <AccordionPrimitive.Trigger
            ref={ref as Ref<HTMLElement>}
            className={className}
            {...props}
            render={el}
            nativeButton={nativeButton}
            id={slotId(el, props.id)}
          >
            {render ? children : undefined}
          </AccordionPrimitive.Trigger>
        ) : (
          <AccordionPrimitive.Trigger
            ref={ref as Ref<HTMLElement>}
            className={cn(
              'relative z-10 flex items-center w-full cursor-pointer outline-none select-none',
              sizeClasses.gap,
              shape.item,
              sizeClasses.px,
              sizeClasses.variant === 'compact' ? 'py-1' : 'py-2',
              !group && 'focus-visible:ring-1 focus-visible:ring-focus-ring focus-visible:ring-offset-0',
              className,
            )}
            {...props}
          >
            {weightShift ? (
              <WeightLabel emphasized={isOpen} lit={lit} className={cn('flex-1 text-left', sizeClasses.text)}>
                {children}
              </WeightLabel>
            ) : (
              <span
                className={cn(
                  'block min-w-0 flex-1 text-left transition-[color] duration-fast',
                  sizeClasses.text,
                  lit ? 'text-foreground' : 'text-muted-foreground',
                )}
              >
                {children}
              </span>
            )}
            {Glyph && (
              <motion.span
                className="shrink-0 inline-flex items-center justify-center"
                animate={{ rotate: isOpen ? 90 : 0 }}
                transition={spring.fast}
              >
                <Glyph
                  size={sizeClasses.icon}
                  strokeWidth={lit ? 2 : 1.5}
                  className={cn(
                    'transition-[color,stroke-width] duration-fast',
                    lit ? 'text-foreground' : 'text-muted-foreground',
                  )}
                />
              </motion.span>
            )}
          </AccordionPrimitive.Trigger>
        )}
      </AccordionPrimitive.Header>
    )

    if (group) {
      return (
        <div ref={triggerRef} onPointerDown={capture}>
          {trigger}
        </div>
      )
    }

    return (
      // biome-ignore lint/a11y/noStaticElementInteractions: hover and press tracking; the trigger inside is the control.
      <div
        className="relative"
        onPointerDown={capture}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <AnimatePresence>
          {isOpen && highlight === 'trigger' && isHovered && (
            <motion.div
              className={cn('absolute inset-0 bg-accent/20 dark:bg-accent/12 pointer-events-none', shape.bg)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              // A state tint rides the moderate tier; the hover fill below tracks the pointer and stays fast.
              exit={{ opacity: 0, transition: spring.moderate.exit }}
              transition={{ duration: spring.moderate.exit.duration }}
            />
          )}
        </AnimatePresence>
        <AnimatePresence>
          {isHovered && (
            <motion.div
              className={cn('absolute inset-0 z-1 bg-hover pointer-events-none', shape.bg)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: spring.fast.exit }}
              transition={{ duration: spring.fast.duration }}
            />
          )}
        </AnimatePresence>
        {trigger}
      </div>
    )
  },
)

AccordionTrigger.displayName = 'AccordionTrigger'

Object.assign(Accordion, {
  Group: AccordionGroup,
  Item: AccordionItem,
  Trigger: AccordionTrigger,
  Content: AccordionContent,
})

export type { AccordionContentProps } from './accordion-content'
export type { AccordionGroupProps } from './accordion-group'
export type { AccordionItemProps, AccordionProps, AccordionTriggerProps }
export { Accordion, AccordionContent, AccordionGroup, AccordionItem, AccordionTrigger }
export default Accordion
