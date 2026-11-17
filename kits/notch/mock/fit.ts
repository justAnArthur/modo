/*
 * Mock: scale a fixed-size stage down to the width it gets (CSS zoom, as the
 * docs' bento previews do), so a screen keeps its proportions in a narrow
 * column. Never above 1:1.
 */

'use client'

import { useLayoutEffect, useRef, useState } from 'react'

export function useFitScale(width: number) {
  const outer = useRef<HTMLDivElement | null>(null)
  const [scale, setScale] = useState(1)

  useLayoutEffect(() => {
    const el = outer.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setScale(Math.min(1, entry.contentRect.width / width))
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [width])

  return { outer, scale }
}
