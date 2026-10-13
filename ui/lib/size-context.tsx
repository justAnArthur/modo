// biome-ignore-all lint: vendored upstream code keeps its own patterns (see the header)
/*
 * Vendored from Fluid Functionalism — `registry/default/lib/size-context.tsx` at
 * github.com/mickadesign/fluid-functionalism@b3587bdbd83fc66c2a6aae3817ffb856cb09260b
 * (fluidfunctionalism.com). MIT License © 2026 Micka Touillaud — see
 * LICENSE.fluid-functionalism in this package.
 *
 * Local modifications:
 * - `"use client"` directive dropped (no RSC here).
 * - `SizeProvider` moved to `primitives/sizes/index.tsx`, the documented
 *   item (sized components import it from there); `SizeContext` exported for it.
 * - `sizeMap`, `typeScale` and their types moved to `lib/size-scale.ts` (plain
 *   data a server module can import) and re-exported here; their text classes
 *   read DS tokens (`text-[13px]` / `text-[12px]` → `text-body` / `text-body-compact`).
 */

import { createContext, useContext } from 'react'
import {
  type SizeClasses,
  type SizeVariant,
  sizeMap,
  type TypeScaleRole,
  type TypeScaleStep,
  typeScale,
} from './size-scale'

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

export type { SizeClasses, SizeVariant, TypeScaleRole, TypeScaleStep }
export { SizeContext, sizeMap, typeScale, useSize, useSizeContext, useSizeVariant, useTypeScale }
