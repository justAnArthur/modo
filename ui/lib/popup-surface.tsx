/*
 * Local addition (not part of Fluid Functionalism): the lifted, morphing
 * surface inside every overlay's Base UI popup.
 */

'use client'

import type { ReactNode } from 'react'
import { MorphSurface } from './morph-layers'
import { useShape } from './shape-context'
import { SURFACE_BG, SURFACE_SHADOW } from './surface-classes'
import { SurfaceProvider, useLift } from './surface-context'
import type { Morph } from './use-morph'

interface PopupSurfaceProps {
  /** The engine, from `useMorph`. */
  morph: Morph
  /** `'popup'`: menus, lists and popovers, 2 levels up on a fixed shadow. `'panel'`: dialogs and sheets, 4 levels up with the level's shadow. Defaults to `'popup'`. */
  lift?: 'popup' | 'panel'
  /** Radius class the surface rests at. Defaults to the shape's `container`. */
  radius?: string
  /** Classes for the content box: padding, width, layout. */
  className?: string
  /** The overlay's content; it reads the surface's level as its substrate. */
  children?: ReactNode
}

const LIFT = { popup: 2, panel: 4 } as const

/**
 * Lifts the overlay off its substrate, re-provides that level for what is
 * inside, and renders `MorphSurface` with the level's background. Popups keep
 * a fixed `shadow-surface-3`; panels take the shadow of their level.
 */
export function PopupSurface({ morph, lift = 'popup', radius, className, children }: PopupSurfaceProps) {
  const shape = useShape()
  const level = useLift(LIFT[lift])

  return (
    <SurfaceProvider value={level}>
      <MorphSurface
        morph={morph}
        bg={SURFACE_BG[level]}
        shadow={SURFACE_SHADOW[lift === 'panel' ? level : 3]}
        radius={radius ?? shape.container}
        className={className}
      >
        {children}
      </MorphSurface>
    </SurfaceProvider>
  )
}
