// surfaces (elevation model) — React primitives the lib ships.
// a component can wrap itself in <Elevated offset={n}> to lift relative
// to its substrate. nested wrappers stack: dropdown on a page → surface 3,
// dropdown on a dialog (substrate 5) → surface 7. the shadow can be decoupled
// from the background via the `shadowLevel` prop.

import { createContext, forwardRef, useContext, type ComponentPropsWithoutRef, type ReactNode } from 'react'

const SurfaceContext = createContext<number>(1)

/** read the current surface level (1..8). defaults to 1. */
export function useSurface(): number {
  return useContext(SurfaceContext)
}

interface SurfaceProviderProps {
  /** the new substrate level for descendants (1..8). clamped to [1, 8]. */
  value: number
  children: ReactNode
}

/** sets a new surface level for descendants. used internally by <Elevated>. */
export function SurfaceProvider({ value, children }: SurfaceProviderProps) {
  return (
    <SurfaceContext.Provider value={Math.max(1, Math.min(8, value))}>
      {children}
    </SurfaceContext.Provider>
  )
}

interface ElevatedProps extends ComponentPropsWithoutRef<'div'> {
  /**
   * steps above the current substrate. conventional offsets:
   *   2 — dropdown / popover / select menu
   *   3 — tooltip
   *   4 — dialog / modal
   *   6 — command palette
   */
  offset: number
  /**
   * override for the shadow level. defaults to the computed surface level.
   * use a fixed value when the component should keep a constant shadow
   * weight regardless of nesting (e.g. a dropdown always at shadow-3).
   */
  shadowLevel?: number
  children?: ReactNode
}

/**
 * lifts relative to the current surface. level = min(substrate + offset, 8).
 * pairs with --surface-N + --shadow-N from the user's tokens.
 */
export const Elevated = forwardRef<HTMLDivElement, ElevatedProps>(
  ({ offset, shadowLevel, className, children, style, ...props }, ref) => {
    const substrate = useSurface()
    const level = Math.min(Math.max(1, substrate + offset), 8)
    const shadow = shadowLevel ?? level
    return (
      <SurfaceProvider value={level}>
        <div
          ref={ref}
          data-aui="elevated"
          data-surface={level}
          data-shadow={shadow}
          className={className}
          style={{
            background: `var(--surface-${level})`,
            boxShadow: `var(--shadow-${shadow})`,
            ...style,
          }}
          {...props}
        >
          {children}
        </div>
      </SurfaceProvider>
    )
  }
)
Elevated.displayName = 'Elevated'
