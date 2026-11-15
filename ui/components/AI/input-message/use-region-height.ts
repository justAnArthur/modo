/*!
 * Ported from Fluid Functionalism — github.com/mickadesign/fluid-functionalism
 * `registry/default/input-message.tsx` @ b3587bdbd83fc66c2a6aae3817ffb856cb09260b
 * MIT License © 2026 Micka Touillaud (notice: LICENSE.fluid-functionalism). Local changes: see PORTING.md.
 */

'use client'

import { useCallback, useRef, useState } from 'react'

/**
 * The pixel height of a collapsible region, for motion to animate to. An
 * `"auto"` target resolves from the transformed size, so under a scaled
 * ancestor the region would overshoot and snap back. Put the ref on the
 * region's content: the height is its clipping parent's `scrollHeight`, and
 * observing the child keeps the observer out of a loop with the animation.
 */
export function useRegionHeight() {
  const observer = useRef<ResizeObserver | null>(null)
  const [height, setHeight] = useState<number | null>(null)
  const ref = useCallback((el: HTMLElement | null) => {
    observer.current?.disconnect()
    observer.current = null
    if (!el) return
    const sync = () => {
      const next = el.parentElement?.scrollHeight ?? el.offsetHeight
      if (next > 0) setHeight(next)
    }
    sync()
    observer.current = new ResizeObserver(sync)
    observer.current.observe(el)
  }, [])
  return [ref, height] as const
}
