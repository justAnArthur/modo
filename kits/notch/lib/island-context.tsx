/*
 * What an Island tells the content inside it: its state, the notch and panel
 * it grows between, and its current outline, so a tab strip can leave the
 * notch free and a layout can start below it.
 */

'use client'

import { createContext, useContext } from 'react'
import type { IslandGeometry, IslandState, Shape } from './geometry'

export interface IslandContextValue {
  state: IslandState
  geometry: IslandGeometry
  /** The outline of `state`, fitted to the room the island has. */
  shape: Shape
}

export const IslandContext = createContext<IslandContextValue | null>(null)

/** The enclosing Island's state and geometry, or `null` outside one. */
export function useIsland() {
  return useContext(IslandContext)
}
