// local elevation primitives for the demo. the lib used to ship these
// (`modo-atomic-ui` exported Elevated / SurfaceProvider / useSurface),
// but the elevation model is host content — see AGENTS.md ("libs are
// zero content defaults"). the demo owns this copy; other projects
// would either inline their own or copy this file.

import { type ComponentPropsWithoutRef, createContext, forwardRef, type ReactNode, useContext } from 'react'

const SurfaceContext = createContext<number>(1)

export function useSurface(): number {
  return useContext(SurfaceContext)
}

interface SurfaceProviderProps {
  value: number
  children: ReactNode
}

export function SurfaceProvider({ value, children }: SurfaceProviderProps) {
  return (
    <SurfaceContext.Provider value={Math.max(1, Math.min(8, value))}>
      {children}
    </SurfaceContext.Provider>
  )
}

interface ElevatedProps extends ComponentPropsWithoutRef<'div'> {
  offset?: number
  shadowLevel?: number
  children?: ReactNode
}

export function useCurrentSurfaceLevel(offset: number = 1, shadowLevel?: number) {
  const substrate = useSurface()
  const level = Math.min(Math.max(1, substrate + offset), 8)
  const shadow = shadowLevel ?? level
  return [level, shadow] as const
}

export const Elevated = forwardRef<HTMLDivElement, ElevatedProps>(
  ({ offset, shadowLevel, className, children, style, ...props }, ref) => {
    const [level, shadow] = useCurrentSurfaceLevel(offset, shadowLevel)

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
