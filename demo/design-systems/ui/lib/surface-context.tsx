/*
 * Vendored from Fluid Functionalism — `registry/default/lib/surface-context.tsx` at
 * github.com/mickadesign/fluid-functionalism@b3587bdbd83fc66c2a6aae3817ffb856cb09260b
 * (fluidfunctionalism.com). MIT License © 2026 Micka Touillaud — see
 * LICENSE.fluid-functionalism in this package.
 *
 * Local modifications:
 * - `"use client"` directive dropped (no RSC here).
 */

import { createContext, type ReactNode, useContext } from 'react'

const SurfaceContext = createContext<number>(1)

export function useSurface(): number {
  return useContext(SurfaceContext)
}

export function SurfaceProvider({ value, children }: { value: number; children: ReactNode }) {
  return <SurfaceContext.Provider value={Math.max(1, Math.min(8, value))}>{children}</SurfaceContext.Provider>
}
