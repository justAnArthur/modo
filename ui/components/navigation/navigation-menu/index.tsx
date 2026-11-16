/*!
 * Local addition (not part of Fluid Functionalism): a site header's
 * navigation menu on Base UI's NavigationMenu, its panel growing out of its
 * trigger through the morph layer (`lib/use-morph.ts`).
 */

'use client'

import { NavigationMenu as NavigationMenuPrimitive } from '@base-ui/react/navigation-menu'
import {
  type ComponentPropsWithoutRef,
  type ForwardRefExoticComponent,
  forwardRef,
  type ReactNode,
  type RefAttributes,
  useMemo,
  useRef,
  useState,
} from 'react'
import { type AnchorProps, positionerProps, usePortalContainer } from '../../../lib/overlay'
import { POPUP_SHAPE } from '../../../lib/popup'
import { PopupSurface } from '../../../lib/popup-surface'
import { useReduceMotion } from '../../../lib/reduced-motion'
import type { SizeVariant } from '../../../lib/size-context'
import { useControllableState } from '../../../lib/use-controllable-state'
import { type MorphProps, useMorph, useMorphOrigin } from '../../../lib/use-morph'
import { cn } from '../../../lib/utils'
import { SizeScope } from '../../../primitives/sizes'
import { NavigationMenuContent } from './content'
import { NavigationMenuContext } from './context'
import { NavigationMenuItem } from './item'
import { NavigationMenuLink } from './link'
import { NavigationMenuList } from './list'
import { NavigationMenuTrigger } from './trigger'

interface NavigationMenuProps
  extends AnchorProps,
    MorphProps,
    Omit<
      ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.Root>,
      'value' | 'defaultValue' | 'onValueChange' | 'className' | 'children' | 'render'
    > {
  /** The open item's `value`, or `null` while closed. Controlled — pair it with `onValueChange`. */
  value?: string | null
  /** The item open on first render when uncontrolled. Defaults to `null`. */
  defaultValue?: string | null
  /** Called with the open item's value, or `null` as the menu closes. */
  onValueChange?: (value: string | null) => void
  /** Hover delay before a panel opens, in ms. Defaults to `50`. */
  delay?: number
  /** Delay before the panel closes once the pointer leaves, in ms. Defaults to `50`. */
  closeDelay?: number
  /** Pins the strip and its panels to one step of the size ladder. Defaults to the surrounding SizeProvider. */
  size?: SizeVariant
  /** Classes for the `nav` root. */
  className?: string
  /** A `NavigationMenu.List`. */
  children?: ReactNode
}

type NavigationMenuComponent = ForwardRefExoticComponent<NavigationMenuProps & RefAttributes<HTMLElement>> & {
  List: typeof NavigationMenuList
  Item: typeof NavigationMenuItem
  Trigger: typeof NavigationMenuTrigger
  Content: typeof NavigationMenuContent
  Link: typeof NavigationMenuLink
}

/**
 * A site header's navigation: top-level links, and triggers that open a
 * panel of links.
 *
 * The panel grows out of the trigger that opened it (see Morph) and closes
 * back into it. It is one surface, shared by every item: moving to another
 * trigger keeps it open and springs it to the new panel's size while the
 * content slides in from that side. One fluid hover highlight runs along the
 * strip and one inside the panel; a liquid marker melts from item to item
 * under the open one, else under the current page's link (`active`). The
 * panel lifts two surface levels off its substrate.
 *
 * Built on Base UI's NavigationMenu: panels open on hover or press, arrow
 * keys move along the strip, Down or Tab goes into the open panel, Escape
 * closes it. The open item is `value` / `defaultValue` / `onValueChange`. The
 * root is the `<nav>`: give it an `aria-label`. For a router, pass its link
 * component as a `NavigationMenu.Link`'s `render`
 * (`render={<RouterLink to="/docs" />}`) and set `active` from the route.
 *
 * Statics:
 * - `NavigationMenu.List` — the strip.
 * - `NavigationMenu.Item` — one entry: a Trigger and its Content, or a Link; `value`.
 * - `NavigationMenu.Trigger` — opens its item's panel; the chevron turns and the label turns semibold while open.
 * - `NavigationMenu.Content` — the item's panel; lay it out with `className`.
 * - `NavigationMenu.Link` — a top-level item in the strip, a row in a panel (`icon`, `description`); `active`, `closeOnClick`, `render`.
 *
 * @example {@include ./examples.mdx}
 */
const NavigationMenu = forwardRef<HTMLElement, NavigationMenuProps>(
  (
    {
      value: valueProp,
      defaultValue = null,
      onValueChange,
      delay = 50,
      closeDelay = 50,
      side,
      align,
      sideOffset,
      container,
      from,
      effect,
      hideSource,
      tier,
      size,
      className,
      children,
      ...props
    },
    ref,
  ) => {
    const [value, setValue] = useControllableState<string | null>(valueProp, defaultValue, onValueChange)
    const { origin, capture } = useMorphOrigin()
    const triggers = useRef(new Map<string, HTMLElement>())
    const [list, setList] = useState<HTMLElement | null>(null)
    const morph = useMorph(value !== null, origin, { from, effect, hideSource, tier })
    const ctx = useMemo(() => ({ value, triggers, setList }), [value])
    const reduceMotion = useReduceMotion()

    return (
      <SizeScope size={size}>
        <NavigationMenuContext.Provider value={ctx}>
          <NavigationMenuPrimitive.Root
            ref={ref}
            value={value}
            onValueChange={(next: string | null, details) => {
              // Every switch re-points the origin, so the panel closes into the trigger that is open.
              if (next !== null) capture({ trigger: triggers.current.get(next), event: details.event })
              setValue(next)
            }}
            delay={delay}
            closeDelay={closeDelay}
            className={cn('relative', className)}
            {...props}
          >
            {children}
            <NavigationMenuPrimitive.Portal container={usePortalContainer(container)}>
              <NavigationMenuPrimitive.Positioner
                {...positionerProps(
                  { side, align, sideOffset, effect, hideSource },
                  { side: 'bottom', align: 'start', sideOffset: 6 },
                )}
                anchor={list}
                collisionPadding={8}
              >
                <NavigationMenuPrimitive.Popup
                  ref={morph.popupRef}
                  className={cn(
                    'relative h-[var(--popup-height)] w-[var(--popup-width)] outline-none',
                    !reduceMotion && 'transition-[width,height] duration-moderate',
                  )}
                >
                  <PopupSurface
                    morph={morph}
                    radius={POPUP_SHAPE.container}
                    className={cn('size-full overflow-hidden', POPUP_SHAPE.container)}
                  >
                    <NavigationMenuPrimitive.Viewport className="relative size-full" />
                  </PopupSurface>
                </NavigationMenuPrimitive.Popup>
              </NavigationMenuPrimitive.Positioner>
            </NavigationMenuPrimitive.Portal>
          </NavigationMenuPrimitive.Root>
        </NavigationMenuContext.Provider>
      </SizeScope>
    )
  },
) as NavigationMenuComponent

NavigationMenu.displayName = 'NavigationMenu'

Object.assign(NavigationMenu, {
  List: NavigationMenuList,
  Item: NavigationMenuItem,
  Trigger: NavigationMenuTrigger,
  Content: NavigationMenuContent,
  Link: NavigationMenuLink,
})

export type { NavigationMenuContentProps } from './content'
export type { NavigationMenuItemProps } from './item'
export type { NavigationMenuLinkProps } from './link'
export type { NavigationMenuListProps } from './list'
export type { NavigationMenuTriggerProps } from './trigger'
export type { NavigationMenuProps }
export {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
}
export default NavigationMenu
