/*
 * Local addition (not part of Fluid Functionalism): the NavigationMenu strip.
 * One fluid hover highlight, one liquid marker under the open item (else the
 * current page's link) and one keyboard ring travel along it.
 */

'use client'

import { NavigationMenu as NavigationMenuPrimitive } from '@base-ui/react/navigation-menu'
import {
  type ComponentPropsWithoutRef,
  forwardRef,
  type ReactNode,
  type SyntheticEvent,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import { FluidHoverHighlight } from '../../../lib/fluid-hover-highlight'
import { FocusRing } from '../../../lib/focus-ring'
import { GooIndicator } from '../../../lib/goo-indicator'
import { useMergeRefs } from '../../../lib/merge-refs'
import { useRowFocus } from '../../../lib/row-group'
import { useShape } from '../../../lib/shape-context'
import { useFluidHover } from '../../../lib/use-fluid-hover'
import { cn } from '../../../lib/utils'
import { useNavigationMenu } from './context'
import { useDomRows } from './use-dom-rows'

interface NavigationMenuListProps extends ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.List> {
  /** `NavigationMenu.Item`s. */
  children?: ReactNode
}

const NavigationMenuList = forwardRef<HTMLUListElement, NavigationMenuListProps>(
  ({ className, children, ...props }, ref) => {
    const { value, setList } = useNavigationMenu('NavigationMenu.List')
    const own = useRef<HTMLUListElement | null>(null)
    const [element, setElement] = useState<HTMLUListElement | null>(null)
    const mergedRef = useMergeRefs<HTMLUListElement>(own, ref, setList, setElement)
    const shape = useShape()
    const hover = useFluidHover(own, { axis: 'x' })
    const focus = useRowFocus(hover)
    const rows = useDomRows(element, hover.registerItem, 'strip')

    // Read from the DOM after it settles: the open trigger, else the link Base UI marks `data-active`.
    const [marked, setMarked] = useState(-1)
    useLayoutEffect(() => {
      const items = rows.current
      const open = value === null ? -1 : items.findIndex(el => el.dataset.navigationMenuValue === value)
      setMarked(open >= 0 ? open : items.findIndex(el => el.hasAttribute('data-active')))
    })
    const markedRect = hover.isMeasured && marked >= 0 ? hover.itemRects[marked] : undefined

    // The panels are React children of their items, portalled out of the strip: their events
    // bubble here too, and React reports no mouse leave on the way into them.
    const inStrip = (e: SyntheticEvent) => e.currentTarget.contains(e.target as Node)

    return (
      <NavigationMenuPrimitive.List
        ref={mergedRef}
        onMouseEnter={hover.handlers.onMouseEnter}
        onMouseLeave={hover.handlers.onMouseLeave}
        onMouseMove={e => (inStrip(e) ? hover.handlers.onMouseMove(e) : hover.handlers.onMouseLeave())}
        onClick={e => inStrip(e) && hover.handlers.onClick(e)}
        onFocus={e => inStrip(e) && focus.handlers.onFocus(e)}
        onBlur={e => inStrip(e) && focus.handlers.onBlur(e)}
        className={cn('relative m-0 flex list-none items-center p-0', className)}
        {...props}
      >
        {/* A list item, so the strip stays valid markup. */}
        <li aria-hidden className="contents">
          {markedRect && <GooIndicator rect={markedRect} className={cn('bg-active', shape.bg)} />}
          <FluidHoverHighlight hover={hover} className={shape.bg} />
          <FocusRing rect={focus.focusRect} className={shape.focusRing} />
        </li>
        {children}
      </NavigationMenuPrimitive.List>
    )
  },
)

NavigationMenuList.displayName = 'NavigationMenuList'

export type { NavigationMenuListProps }
export { NavigationMenuList }
