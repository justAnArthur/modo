/*!
 * Ported from Fluid Functionalism — `registry/default/lib/size-context.tsx` at
 * github.com/mickadesign/fluid-functionalism@b3587bdbd83fc66c2a6aae3817ffb856cb09260b
 * (fluidfunctionalism.com). MIT License © 2026 Micka Touillaud — see
 * LICENSE.fluid-functionalism in this package.
 * Local changes: see PORTING.md.
 */

'use client'

import { createContext, useContext } from 'react'
import { type SizeClasses, type SizeVariant, sizeMap, type TypeScaleRole, typeScale } from './size-scale'

/** The type scale resolved for the active ladder step (px per role):
 *  explicit override > surrounding SizeProvider > "default". */
function useTypeScale(override?: SizeVariant | null): Record<TypeScaleRole, number> {
  const variant = useSizeVariant(override)
  return {
    display: typeScale.display[variant],
    title: typeScale.title[variant],
    subtitle: typeScale.subtitle[variant],
    body: typeScale.body[variant],
    caption: typeScale.caption[variant],
  }
}

interface SizeContextValue {
  size: SizeVariant
  setSize: (size: SizeVariant) => void
  classes: SizeClasses
}

const SizeContext = createContext<SizeContextValue | null>(null)

/** Resolve the active size variant: explicit prop > provider > "default". */
function useSizeVariant(override?: SizeVariant | null): SizeVariant {
  const ctx = useContext(SizeContext)
  return override ?? ctx?.size ?? 'default'
}

/** Resolve size classes: explicit prop > provider > "default". */
function useSize(override?: SizeVariant | null): SizeClasses {
  return sizeMap[useSizeVariant(override)]
}

function useSizeContext() {
  const ctx = useContext(SizeContext)
  if (!ctx) throw new Error('useSizeContext must be used within a SizeProvider')
  return ctx
}

export type { SizeClasses, SizeVariant, TypeScaleRole, TypeScaleStep } from './size-scale'
export { SizeContext, useSize, useSizeContext, useSizeVariant, useTypeScale }
