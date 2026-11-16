/*!
 * Ported from Fluid Functionalism — `registry/default/lib/shape-context.tsx` at
 * github.com/mickadesign/fluid-functionalism@b3587bdbd83fc66c2a6aae3817ffb856cb09260b
 * (fluidfunctionalism.com). MIT License © 2026 Micka Touillaud — see
 * LICENSE.fluid-functionalism in this package.
 * Local changes: see PORTING.md.
 */

type ShapeVariant = 'pill' | 'rounded'

interface ShapeClasses {
  /** The variant these classes belong to — handy for conditionals. */
  variant: ShapeVariant
  item: string
  bg: string
  focusRing: string
  mergedBg: string
  container: string
  button: string
  input: string
  // Numeric counterparts of `bg` / `mergedBg`, in px. Needed where individual
  // corners are animated (e.g. the selected-background merge/split animation),
  // which requires per-corner numeric border-radii rather than a class.
  bgRadius: number
  mergedRadius: number
}

const shapeMap: Record<ShapeVariant, ShapeClasses> = {
  pill: {
    variant: 'pill',
    item: 'rounded-[20px]',
    bg: 'rounded-[20px]',
    // +2px over `item` because the focus ring sits 2px outside the element
    // (top/left -2, width/height +4); this keeps the corners concentric so a
    // pill element gets a pill ring (matches the rounded-mode 8px→10px bump).
    focusRing: 'rounded-[22px]',
    mergedBg: 'rounded-2xl',
    container: 'rounded-3xl',
    button: 'rounded-[20px]',
    input: 'rounded-[20px]',
    bgRadius: 20,
    mergedRadius: 16,
  },
  rounded: {
    variant: 'rounded',
    item: 'rounded-lg',
    bg: 'rounded-lg',
    focusRing: 'rounded-[10px]',
    mergedBg: 'rounded-lg',
    container: 'rounded-xl',
    button: 'rounded-lg',
    input: 'rounded-lg',
    bgRadius: 8,
    mergedRadius: 8,
  },
}

export type { ShapeClasses, ShapeVariant }
export { shapeMap }
