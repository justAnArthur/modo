/*!
 * Local addition: a window-sized stage for the AI app's screens. It
 * lays the screen out at a fixed window size and scales the whole thing down
 * to the width it gets (CSS zoom, as the docs' bento previews do), so a
 * 1280px desktop window reads whole inside a docs column. Below that size it
 * stays at 1:1.
 */

'use client'

import { useShape } from '@justanarthur/modo-ui/lib/shape-context'
import { cn } from '@justanarthur/modo-ui/lib/utils'
import { type ReactNode, useLayoutEffect, useRef, useState } from 'react'

export interface ScreenFrameProps {
  /** The window's width in px. Defaults to `1280`. */
  width?: number
  /** The window's height in px. Defaults to `800`. */
  height?: number
  children: ReactNode
  className?: string
}

export function ScreenFrame({ width = 1280, height = 800, children, className }: ScreenFrameProps) {
  const shape = useShape()
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

  return (
    <div ref={outer} className="w-full" style={{ height: height * scale }}>
      <div
        className={cn('overflow-hidden border border-border bg-background', shape.container, className)}
        style={{ width, height, zoom: scale }}
      >
        {children}
      </div>
    </div>
  )
}
