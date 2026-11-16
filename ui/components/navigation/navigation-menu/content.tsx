/*
 * Local addition (not part of Fluid Functionalism): an item's panel. It
 * renders into the menu's one shared viewport and slides in from the side the
 * pointer or the arrow keys came from; its rows have one fluid hover
 * highlight and one keyboard ring.
 */

'use client'

import { NavigationMenu as NavigationMenuPrimitive } from '@base-ui/react/navigation-menu'
import { type ComponentPropsWithoutRef, forwardRef, type ReactNode, useContext, useRef, useState } from 'react'
import { FluidHoverHighlight } from '../../../lib/fluid-hover-highlight'
import { FocusRing } from '../../../lib/focus-ring'
import { useMergeRefs } from '../../../lib/merge-refs'
import { POPUP_SHAPE } from '../../../lib/popup'
import { useReduceMotion } from '../../../lib/reduced-motion'
import { useRowFocus } from '../../../lib/row-group'
import { useFluidHover } from '../../../lib/use-fluid-hover'
import { useKeyboardNavGate } from '../../../lib/use-keyboard-nav-gate'
import { cn } from '../../../lib/utils'
import { InContentContext, ItemContext, useNavigationMenu } from './context'
import { useDomRows } from './use-dom-rows'

interface NavigationMenuContentProps extends ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.Content> {
  /** Classes for the panel: its width and layout (a grid of links, a column). */
  className?: string
  /** `NavigationMenu.Link`s, laid out however the panel needs. */
  children?: ReactNode
}

const SLIDE =
  'data-[starting-style]:data-[activation-direction=right]:translate-x-4 data-[starting-style]:data-[activation-direction=left]:-translate-x-4 data-[ending-style]:data-[activation-direction=right]:-translate-x-4 data-[ending-style]:data-[activation-direction=left]:translate-x-4'

const NavigationMenuContent = forwardRef<HTMLDivElement, NavigationMenuContentProps>(
  ({ className, children, onKeyDownCapture, ...props }, ref) => {
    const { value } = useNavigationMenu('NavigationMenu.Content')
    const open = value === useContext(ItemContext)
    const own = useRef<HTMLDivElement | null>(null)
    const [element, setElement] = useState<HTMLDivElement | null>(null)
    const mergedRef = useMergeRefs<HTMLDivElement>(own, ref, setElement)
    const reduceMotion = useReduceMotion()
    const hover = useFluidHover(own, { axis: 'xy' })
    const { keyboardNavRef, trackKeyboardNav } = useKeyboardNavGate(open)
    const focus = useRowFocus(hover, keyboardNavRef)
    useDomRows(element, hover.registerItem, 'panel')

    return (
      <InContentContext.Provider value={true}>
        <NavigationMenuPrimitive.Content
          ref={mergedRef}
          {...hover.handlers}
          {...focus.handlers}
          onKeyDownCapture={e => {
            trackKeyboardNav(e)
            onKeyDownCapture?.(e)
          }}
          className={cn(
            'relative w-max p-1 transition duration-moderate data-[ending-style]:duration-moderate-exit data-[starting-style]:opacity-0 data-[ending-style]:opacity-0',
            !reduceMotion && SLIDE,
            className,
          )}
          {...props}
        >
          <FluidHoverHighlight hover={hover} hidden={!open} className={POPUP_SHAPE.bg} />
          <FocusRing rect={open ? focus.focusRect : null} className={POPUP_SHAPE.focusRing} />
          {children}
        </NavigationMenuPrimitive.Content>
      </InContentContext.Provider>
    )
  },
)

NavigationMenuContent.displayName = 'NavigationMenuContent'

export type { NavigationMenuContentProps }
export { NavigationMenuContent }
