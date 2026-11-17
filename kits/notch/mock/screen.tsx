/*!
 * Mock: strips of screen edge the island hangs from in the docs, a flash or
 * the wings on their own, and a stage that scales down to its column.
 * Nothing here ships in the barrel.
 */

'use client'

import type { ReactNode } from 'react'
import Island from '../components/island/island'
import { useFitScale } from './fit'

/**
 * The top of a screen: a band the island hangs from, tall enough for what it
 * shows. Narrower than `width`, it scales down whole, so the island keeps the
 * proportions it has on a Mac.
 */
export function ScreenEdge({
  children,
  height = 360,
  width = 760,
}: {
  children: ReactNode
  height?: number
  width?: number
}) {
  const { outer, scale } = useFitScale(width)
  return (
    <div ref={outer} className="w-full" style={{ height: height * scale }}>
      <div
        className="relative mx-auto overflow-hidden rounded-box bg-sunken"
        style={{ width: scale < 1 ? width : '100%', maxWidth: width, height, zoom: scale }}
      >
        {children}
      </div>
    </div>
  )
}

/** A flash below the notch, on a strip of screen. */
export function FlashIsland({ children, activity }: { children: ReactNode; activity?: string }) {
  return (
    <ScreenEdge height={112}>
      <Island defaultState="flash" collapsedState="idle" flash={children} activity={activity} />
    </ScreenEdge>
  )
}

/** An activity in the compact island's wings, with a second one's bubble when `minimal` is given. */
export function WingsIsland({
  leading,
  trailing,
  minimal,
}: {
  leading: ReactNode
  trailing: ReactNode
  minimal?: ReactNode
}) {
  return (
    <ScreenEdge height={64}>
      <Island defaultState={minimal ? 'split' : 'compact'} leading={leading} trailing={trailing} minimal={minimal} />
    </ScreenEdge>
  )
}

/** Lays `children` out at `width` and scales them down whole when the column is narrower. */
export function Fit({ width, children }: { width: number; children: ReactNode }) {
  const { outer, scale } = useFitScale(width)
  return (
    <div ref={outer} className="flex w-full justify-center">
      <div className="shrink-0" style={{ width: scale < 1 ? width : '100%', maxWidth: width, zoom: scale }}>
        {children}
      </div>
    </div>
  )
}
