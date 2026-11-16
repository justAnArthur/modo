/*
 * Local addition (not part of Fluid Functionalism): a NavigationMenu entry,
 * and the classes its strip-level trigger or link shares.
 */

'use client'

import { NavigationMenu as NavigationMenuPrimitive } from '@base-ui/react/navigation-menu'
import { type ComponentPropsWithoutRef, forwardRef, useId } from 'react'
import type { ShapeClasses } from '../../../lib/shape-context'
import type { SizeClasses } from '../../../lib/size-context'
import { cn } from '../../../lib/utils'
import { ItemContext } from './context'

interface NavigationMenuItemProps extends ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.Item> {
  /** Names the item for a controlled `value`. Defaults to a generated id. */
  value?: string
}

const NavigationMenuItem = forwardRef<HTMLLIElement, NavigationMenuItemProps>(({ value, ...props }, ref) => {
  const generated = useId()
  const itemValue = value ?? generated
  return (
    <ItemContext.Provider value={itemValue}>
      <NavigationMenuPrimitive.Item ref={ref} value={itemValue} {...props} />
    </ItemContext.Provider>
  )
})

NavigationMenuItem.displayName = 'NavigationMenuItem'

/** A strip trigger or link: muted until hovered, open or current, above the strip's highlight and marker. */
function stripItemClasses(size: SizeClasses, shape: ShapeClasses, lit: boolean) {
  return cn(
    'group/strip relative z-10 flex cursor-pointer select-none items-center border-none bg-transparent no-underline outline-none',
    'transition-[color] duration-fast data-[fluid-hover-active]:text-foreground',
    size.control,
    size.px,
    size.gap,
    size.text,
    shape.button,
    lit ? 'text-foreground' : 'text-muted-foreground',
  )
}

export type { NavigationMenuItemProps }
export { NavigationMenuItem, stripItemClasses }
