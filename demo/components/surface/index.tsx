import './surface.css'
import { Elevated, SurfaceProvider } from './elevated'

/**
 * A swatch at a fixed level of the surface ladder. Pairs the level's
 * `--surface-N` background with its `--shadow-N` recipe, so a single
 * piece of UI can be read against any elevation.
 *
 * Pinned to a fixed level via `<SurfaceProvider value={1}>` + `<Elevated>`,
 * so the swatch always shows the requested level regardless of where it
 * is mounted in the tree.
 *
 * @example
 * # Single level
 *
 * ```tsx
 * <Surface level={3} />
 * ```
 *
 * @example
 * # Custom label
 *
 * ```tsx
 * <Surface level={5} label="dialog" />
 * ```
 *
 * @example
 * # The full ladder
 *
 * ```tsx
 * <Surface level={1} />
 * <Surface level={2} />
 * <Surface level={3} />
 * <Surface level={4} />
 * <Surface level={5} />
 * <Surface level={6} />
 * <Surface level={7} />
 * <Surface level={8} />
 * ```
 */
export default function Surface({
                                  level = 1,
                                  label,
                                }: {
  /** Which level of the surface ladder (1..8). @default 1 */
  level?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8
  /** Label shown inside the card. @default `surface-N` */
  label?: string
}) {
  const clamped = Math.max(1, Math.min(8, level)) as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8
  const text = label ?? `surface-${clamped}`
  return (
    <SurfaceProvider value={1}>
      <Elevated offset={clamped - 1} className="modo-surface">
        <span data-aui="surface-label">{text}</span>
      </Elevated>
    </SurfaceProvider>
  )
}
