// biome-ignore-all lint: vendored upstream code keeps its own patterns (see the header)
/*!
 * Part of the ColorPicker port (Fluid Functionalism `registry/default/color-picker.tsx` @ b3587bdbd83fc66c2a6aae3817ffb856cb09260b,
 * MIT License © 2026 Micka Touillaud). Local changes: see PORTING.md.
 */

'use client'

import { type CSSProperties, forwardRef, type HTMLAttributes, useEffect, useMemo, useState } from 'react'
import { useIcon } from '../../../lib/icon-context'
import { useShape } from '../../../lib/shape-context'
import { useSize } from '../../../lib/size-context'
import { cn } from '../../../lib/utils'
import { parseColor, resolveCssColor, rgbToHexStr } from './color-math'

export const CHECKER_BG: CSSProperties = {
  backgroundImage:
    'conic-gradient(var(--checker-a) 0 25%, var(--checker-b) 0 50%, var(--checker-a) 0 75%, var(--checker-b) 0)',
  backgroundSize: '8px 8px',
}

export interface ColorSwatchProps extends Omit<HTMLAttributes<HTMLButtonElement>, 'color'> {
  /** The swatch color — any CSS color string. */
  color: string
  /** Edge length in pixels. Defaults to `28`. */
  size?: number
  /** Draws the selection ring. */
  selected?: boolean
}

// Not in TypeScript's DOM lib: read through a cast, detected at runtime.
interface EyeDropperGlobal {
  open(): Promise<{ sRGBHex: string }>
}

export function EyeDropperButton({ onPick }: { onPick: (hex: string) => void }) {
  const [supported, setSupported] = useState(false)
  const shape = useShape()
  const sizeClasses = useSize()
  const PipetteIcon = useIcon('pipette')

  useEffect(() => {
    setSupported(typeof window !== 'undefined' && 'EyeDropper' in window)
  }, [])

  if (!supported) return null

  const handleClick = async () => {
    try {
      const Ctor = (window as unknown as { EyeDropper: new () => EyeDropperGlobal }).EyeDropper
      const eye = new Ctor()
      const result = await eye.open()
      onPick(result.sRGBHex)
    } catch {
      // Cancelled.
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label="Pick color from screen"
      className={cn(
        'flex items-center justify-center text-muted-foreground bg-transparent hover:bg-hover hover:text-foreground active:bg-active transition-colors duration-fast outline-none focus-visible:ring-1 focus-visible:ring-focus-ring cursor-pointer',
        sizeClasses.control,
        sizeClasses.px,
        shape.input,
      )}
    >
      <PipetteIcon size={sizeClasses.icon} strokeWidth={1.5} />
    </button>
  )
}

interface ColorTileProps {
  color: string
  size?: number
  className?: string
  style?: CSSProperties
}

export function ColorTile({ color, size = 24, className, style }: ColorTileProps) {
  const shape = useShape()
  return (
    <span
      className={cn('inline-block relative shrink-0 overflow-hidden shadow-swatch', shape.bg, className)}
      style={{
        width: size,
        height: size,
        ...CHECKER_BG,
        ...style,
      }}
    >
      <span className="absolute inset-0" style={{ backgroundColor: color }} />
    </span>
  )
}

export const ColorSwatch = forwardRef<HTMLButtonElement, ColorSwatchProps>(
  ({ color, size = 28, selected, className, onMouseEnter, onMouseLeave, ...props }, ref) => {
    const shape = useShape()
    const [hovered, setHovered] = useState(false)
    const ring = selected ? 'shadow-swatch-selected' : hovered ? 'shadow-swatch-hover' : 'shadow-swatch'
    return (
      <button
        ref={ref}
        type="button"
        aria-label={`Select color ${color}`}
        className={cn(
          'relative shrink-0 overflow-hidden cursor-pointer outline-none transition-shadow duration-100',
          shape.bg,
          ring,
          className,
        )}
        style={{
          width: size,
          height: size,
          ...CHECKER_BG,
        }}
        onMouseEnter={e => {
          setHovered(true)
          onMouseEnter?.(e)
        }}
        onMouseLeave={e => {
          setHovered(false)
          onMouseLeave?.(e)
        }}
        {...props}
      >
        <span className="absolute inset-0" style={{ backgroundColor: color }} />
      </button>
    )
  },
)

ColorSwatch.displayName = 'ColorSwatch'

export function SwatchStrip({
  swatches,
  current,
  onPick,
}: {
  swatches: string[]
  current: string
  onPick: (color: string) => void
}) {
  const normalizedCurrent = useMemo(() => {
    const p = parseColor(current)
    return p ? rgbToHexStr(p.r, p.g, p.b, p.a).toLowerCase() : ''
  }, [current])

  // Named colors resolve through the DOM: in an effect, never during render (SSR).
  const [resolvedSwatches, setResolvedSwatches] = useState<Record<string, string>>({})
  useEffect(() => {
    const next: Record<string, string> = {}
    for (const sw of swatches) {
      if (!parseColor(sw)) {
        const p = resolveCssColor(sw)
        if (p) next[sw] = rgbToHexStr(p.r, p.g, p.b, p.a).toLowerCase()
      }
    }
    setResolvedSwatches(next)
  }, [swatches])

  return (
    <div className="flex flex-wrap gap-2">
      {swatches.map((sw, i) => {
        const parsed = parseColor(sw)
        const normalized = parsed
          ? rgbToHexStr(parsed.r, parsed.g, parsed.b, parsed.a).toLowerCase()
          : (resolvedSwatches[sw] ?? sw.toLowerCase())
        const isSelected = normalized === normalizedCurrent
        return <ColorSwatch key={`${sw}-${i}`} color={sw} size={28} selected={isSelected} onClick={() => onPick(sw)} />
      })}
    </div>
  )
}
