/*
 * Local addition (not part of Fluid Functionalism): the NavigationMenu
 * strip's liquid marker as a part of its own, so a host can place and fill
 * it. The List draws the same marker itself until one of these claims it.
 */

'use client'

import { useContext, useLayoutEffect } from 'react'
import { GooIndicator } from '../../../lib/goo-indicator'
import { useShape } from '../../../lib/shape-context'
import { cn } from '../../../lib/utils'
import { ListMarkerContext } from './context'

interface NavigationMenuIndicatorProps {
  /** Classes for the marker: its fill. Defaults to the `bg-active` overlay. */
  className?: string
}

/** The liquid marker under the open item, else under the current page's link. */
function NavigationMenuIndicator({ className }: NavigationMenuIndicatorProps) {
  const marker = useContext(ListMarkerContext)
  if (!marker) throw new Error('NavigationMenu.Indicator must be inside NavigationMenu.List')
  const { rect, claim } = marker
  const shape = useShape()

  useLayoutEffect(claim, [claim])

  // A list item, so the strip stays valid markup.
  return (
    <li aria-hidden className="contents">
      {rect && <GooIndicator rect={rect} className={cn('bg-active', shape.bg, className)} />}
    </li>
  )
}

export type { NavigationMenuIndicatorProps }
export { NavigationMenuIndicator }
