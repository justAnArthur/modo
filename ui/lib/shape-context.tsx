/*!
 * Ported from Fluid Functionalism — `registry/default/lib/shape-context.tsx` at
 * github.com/mickadesign/fluid-functionalism@b3587bdbd83fc66c2a6aae3817ffb856cb09260b
 * (fluidfunctionalism.com). MIT License © 2026 Micka Touillaud — see
 * LICENSE.fluid-functionalism in this package.
 * Local changes: see PORTING.md.
 */

'use client'

import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { type ShapeClasses, type ShapeVariant, shapeMap } from './shape-classes'

interface ShapeContextValue {
  shape: ShapeVariant
  setShape: (shape: ShapeVariant) => void
  classes: ShapeClasses
}

const ShapeContext = createContext<ShapeContextValue | null>(null)

// Rounded is the default on every path: the site demos render under
// <ShapeProvider defaultShape="rounded">, the shipped :focus-visible fallback
// ring assumes its 8px radius, and the preset generators only emit a provider
// for pill. A consumer with no provider gets the corners the docs show.
function useShape(): ShapeClasses {
  const ctx = useContext(ShapeContext)
  if (!ctx) return shapeMap.rounded
  return ctx.classes
}

function ShapeProvider({ children, defaultShape = 'rounded' }: { children: ReactNode; defaultShape?: ShapeVariant }) {
  const [shape, setShapeState] = useState<ShapeVariant>(defaultShape)
  const transitionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Run a state change under the `.transitioning` guard (added + reflow-flushed
  // first so the 180ms border-radius cross-fade applies). Clearing the previous
  // timeout first keeps a double-press from removing the class mid-fade.
  const transitionShape = useCallback((callback: () => void) => {
    const root = document.documentElement
    root.classList.add('transitioning')
    void root.offsetHeight
    callback()
    if (transitionTimeoutRef.current) clearTimeout(transitionTimeoutRef.current)
    transitionTimeoutRef.current = setTimeout(() => root.classList.remove('transitioning'), 200)
  }, [])

  const setShape = useCallback(
    (next: ShapeVariant) => {
      transitionShape(() => setShapeState(next))
    },
    [transitionShape],
  )

  // Publish the current element radius as a CSS custom property so plain-CSS
  // consumers that can't read React context stay in sync with the shape
  // system — e.g. the @layer base :focus-visible fallback ring in
  // globals.css. Set on <html> so portalled content sees it too.
  useEffect(() => {
    document.documentElement.style.setProperty('--shape-input-radius', `${shapeMap[shape].bgRadius}px`)
  }, [shape])

  const value = useMemo(() => ({ shape, setShape, classes: shapeMap[shape] }), [shape, setShape])

  return <ShapeContext.Provider value={value}>{children}</ShapeContext.Provider>
}

export type { ShapeClasses, ShapeVariant } from './shape-classes'
export { ShapeProvider, useShape }
