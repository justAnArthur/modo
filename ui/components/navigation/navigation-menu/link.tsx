/*
 * Local addition (not part of Fluid Functionalism): a NavigationMenu link, a
 * strip item at the top level and a row inside a panel.
 */

'use client'

import { NavigationMenu as NavigationMenuPrimitive } from '@base-ui/react/navigation-menu'
import { type ComponentPropsWithoutRef, forwardRef, type ReactNode, useContext } from 'react'
import type { IconComponent } from '../../../lib/icon-context'
import { POPUP_SHAPE } from '../../../lib/popup'
import { useShape } from '../../../lib/shape-context'
import { useSize } from '../../../lib/size-context'
import { cn } from '../../../lib/utils'
import { WeightLabel } from '../../../lib/weight-label'
import { InContentContext } from './context'
import { stripItemClasses } from './item'
import { ROW_ATTR } from './use-dom-rows'

interface NavigationMenuLinkProps extends ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.Link> {
  /** Marks the current page (`aria-current="page"`). In the strip, the marker rests under it while no panel is open. Defaults to `false`. */
  active?: boolean
  /** Leading icon of a panel row. */
  icon?: IconComponent
  /** A muted line under a panel row's title. */
  description?: ReactNode
  /** Closes the menu when the link is pressed (a client-side route change keeps the page). Defaults to `false`. */
  closeOnClick?: boolean
  /** The link's title. */
  children?: ReactNode
}

const NavigationMenuLink = forwardRef<HTMLAnchorElement, NavigationMenuLinkProps>(
  ({ active = false, icon: Icon, description, className, children, ...props }, ref) => {
    const inContent = useContext(InContentContext)
    const size = useSize()
    const shape = useShape()

    if (!inContent) {
      return (
        <NavigationMenuPrimitive.Link
          ref={ref}
          active={active}
          {...{ [ROW_ATTR]: 'strip' }}
          className={cn(stripItemClasses(size, shape, active), className)}
          {...props}
        >
          <WeightLabel emphasized={active} trim className="whitespace-nowrap">
            {children}
          </WeightLabel>
        </NavigationMenuPrimitive.Link>
      )
    }

    return (
      <NavigationMenuPrimitive.Link
        ref={ref}
        active={active}
        {...{ [ROW_ATTR]: 'panel' }}
        className={cn(
          'group/row relative z-10 flex min-w-0 cursor-pointer select-none no-underline outline-none',
          'text-muted-foreground transition-[color] duration-fast data-[fluid-hover-active]:text-foreground data-[active]:text-foreground',
          description ? 'items-start py-2' : ['items-center', size.control],
          size.itemPx,
          size.gap,
          POPUP_SHAPE.item,
          className,
        )}
        {...props}
      >
        {Icon && (
          <Icon
            size={size.icon}
            strokeWidth={1.5}
            className={cn(
              'shrink-0 transition-[stroke-width] duration-fast group-data-[fluid-hover-active]/row:stroke-[2]',
              description && 'mt-0.5',
            )}
          />
        )}
        <span className="flex min-w-0 flex-col gap-0.5">
          <WeightLabel emphasized={active} truncate="line" className={cn('text-foreground', size.text)}>
            {children}
          </WeightLabel>
          {description && (
            <span
              className={cn(
                'text-muted-foreground',
                size.variant === 'compact' ? 'text-caption-compact' : 'text-caption',
              )}
            >
              {description}
            </span>
          )}
        </span>
      </NavigationMenuPrimitive.Link>
    )
  },
)

NavigationMenuLink.displayName = 'NavigationMenuLink'

export type { NavigationMenuLinkProps }
export { NavigationMenuLink }
