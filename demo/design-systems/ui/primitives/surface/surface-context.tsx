/*
 * Vendored from mickadesign/fluid-functionalism
 * `registry/default/lib/surface-context.tsx` at commit
 * b3587bdbd83fc66c2a6aae3817ffb856cb09260b — MIT License
 * © 2026 Micka Touillaud — fluidfunctionalism.com.
 * Unmodified apart from quote style and making the context exportable.
 */

"use client"

import { createContext, useContext, type ReactNode } from 'react'

export const SurfaceContext = createContext<number>(1)

export function useSurface(): number {
  return useContext(SurfaceContext)
}

export function SurfaceProvider({
  value,
  children,
}: {
  value: number
  children: ReactNode
}) {
  return (
    <SurfaceContext.Provider value={Math.max(1, Math.min(8, value))}>
      {children}
    </SurfaceContext.Provider>
  )
}
