/*
 * Local addition (not part of Fluid Functionalism): the strip button that
 * opens its item's panel.
 */

'use client'

import { NavigationMenu as NavigationMenuPrimitive } from '@base-ui/react/navigation-menu'
import { motion } from 'motion/react'
import { type ComponentPropsWithoutRef, forwardRef, type ReactNode, useCallback, useContext } from 'react'
import { useIcon } from '../../../lib/icon-context'
import { mergeRefs } from '../../../lib/merge-refs'
import { useReduceMotion } from '../../../lib/reduced-motion'
import { useShape } from '../../../lib/shape-context'
import { useSize } from '../../../lib/size-context'
import { spring } from '../../../lib/springs'
import { cn } from '../../../lib/utils'
import { WeightLabel } from '../../../lib/weight-label'
import { ItemContext, useNavigationMenu } from './context'
import { stripItemClasses } from './item'
import { ROW_ATTR } from './use-dom-rows'

interface NavigationMenuTriggerProps extends ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.Trigger> {
  /** The trigger's label. */
  children?: ReactNode
}

const NavigationMenuTrigger = forwardRef<HTMLButtonElement, NavigationMenuTriggerProps>(
  ({ className, children, ...props }, ref) => {
    const { value, triggers } = useNavigationMenu('NavigationMenu.Trigger')
    const itemValue = useContext(ItemContext)
    const size = useSize()
    const shape = useShape()
    const reduceMotion = useReduceMotion()
    const Chevron = useIcon('chevron-down')
    const open = value === itemValue

    const register = useCallback(
      (node: HTMLButtonElement | null) => {
        if (node) triggers.current.set(itemValue, node)
        else triggers.current.delete(itemValue)
      },
      [triggers, itemValue],
    )

    return (
      <NavigationMenuPrimitive.Trigger
        ref={mergeRefs(ref, register)}
        {...{ [ROW_ATTR]: 'strip' }}
        data-navigation-menu-value={itemValue}
        className={cn(stripItemClasses(size, shape, open), className)}
        {...props}
      >
        <WeightLabel emphasized={open} trim className="whitespace-nowrap">
          {children}
        </WeightLabel>
        <motion.span
          aria-hidden
          className="flex"
          initial={false}
          animate={{ rotate: open ? 180 : 0 }}
          transition={reduceMotion ? { duration: 0 } : spring.moderate}
        >
          <Chevron
            size={size.icon}
            strokeWidth={open ? 2 : 1.5}
            className="transition-[stroke-width] duration-fast group-data-[fluid-hover-active]/strip:stroke-[2]"
          />
        </motion.span>
      </NavigationMenuPrimitive.Trigger>
    )
  },
)

NavigationMenuTrigger.displayName = 'NavigationMenuTrigger'

export type { NavigationMenuTriggerProps }
export { NavigationMenuTrigger }
