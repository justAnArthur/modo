/*!
 * Mock: a Mac's screen for the docs, made only of tokens: a wallpaper, a menu
 * bar as tall as the notch, and the island hanging from the top edge over it.
 * It lays the screen out at a fixed size and scales it down to the width it
 * gets (CSS zoom), so a whole desktop reads inside a docs column.
 */

'use client'

import { useShape } from '@justanarthur/modo-ui/lib/shape-context'
import { cn } from '@justanarthur/modo-ui/lib/utils'
import type { ReactNode } from 'react'
import { DEFAULT_NOTCH } from '../lib/geometry'
import { MENUS } from './data'
import { useFitScale } from './fit'

export interface MockDesktopProps {
  /** The screen's width in px. Defaults to `1024`. */
  width?: number
  /** The screen's height in px. Defaults to `640`. */
  height?: number
  /** The menu bar's height: the notch's. Defaults to `32`. */
  notchHeight?: number
  /** The notch's width, kept free in the menu bar. Defaults to `185`. */
  notchWidth?: number
  /** The app named first in the menu bar. Defaults to `'Finder'`. */
  app?: string
  /** The clock at the right end. Defaults to `'Mon 16 Nov 13:05'`. */
  clock?: string
  /** The island, hung from the top edge across the screen's width. */
  island?: ReactNode
  /** Anything else on the desktop, under the menu bar. */
  children?: ReactNode
  className?: string
}

export function MockDesktop({
  width = 1024,
  height = 640,
  notchHeight = DEFAULT_NOTCH.height,
  notchWidth = DEFAULT_NOTCH.width,
  app = 'Finder',
  clock = 'Mon 16 Nov 13:05',
  island,
  children,
  className,
}: MockDesktopProps) {
  const shape = useShape()
  const { outer, scale } = useFitScale(width)

  return (
    <div ref={outer} className="w-full" style={{ height: height * scale }}>
      <div
        className={cn(
          'relative overflow-hidden border border-border bg-linear-to-br from-brand/30 via-surface-2 to-status-info/25',
          shape.container,
          className,
        )}
        style={{ width, height, zoom: scale }}
      >
        <div
          className="absolute inset-x-0 top-0 flex items-center bg-background/70 text-caption text-foreground"
          style={{ height: notchHeight }}
        >
          <div className="flex flex-1 items-center gap-4 px-4">
            <span className="weight-semibold">{app}</span>
            {MENUS.slice(1).map(menu => (
              <span key={menu}>{menu}</span>
            ))}
          </div>
          <div aria-hidden className="shrink-0" style={{ width: notchWidth }} />
          <div className="flex flex-1 items-center justify-end gap-4 px-4 tabular-nums">
            <span>{clock}</span>
          </div>
        </div>
        <div className="absolute inset-x-0 bottom-0" style={{ top: notchHeight }}>
          {children}
        </div>
        <div className="absolute inset-x-0 top-0">{island}</div>
      </div>
    </div>
  )
}
