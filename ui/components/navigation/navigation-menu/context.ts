/*
 * Local addition (not part of Fluid Functionalism): what a NavigationMenu's
 * parts read from its root.
 */

'use client'

import { createContext, type MutableRefObject, useContext } from 'react'
import type { ItemRect } from '../../../lib/use-fluid-hover'

interface NavigationMenuContextValue {
  /** The open item's value, or `null` while closed. */
  value: string | null
  /** Each trigger by its item's value: the panel grows from, and closes into, the open one. */
  triggers: MutableRefObject<Map<string, HTMLElement>>
  /** The strip, which the panel is positioned against. */
  setList: (list: HTMLElement | null) => void
}

const NavigationMenuContext = createContext<NavigationMenuContextValue | null>(null)

/** The value of the item a part sits in. */
const ItemContext = createContext('')

/** The strip's marker: where it sits, and `claim` for a `NavigationMenu.Indicator` that draws it instead of the List (returns the release). */
const ListMarkerContext = createContext<{ rect?: ItemRect; claim: () => () => void } | null>(null)

/** Inside a panel: a link there is a row, not a strip item. */
const InContentContext = createContext(false)

function useNavigationMenu(part: string) {
  const ctx = useContext(NavigationMenuContext)
  if (!ctx) throw new Error(`${part} must be used within NavigationMenu`)
  return ctx
}

export type { NavigationMenuContextValue }
export { InContentContext, ItemContext, ListMarkerContext, NavigationMenuContext, useNavigationMenu }
