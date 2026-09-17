import type { ReactNode } from 'react'
import { Badge as FluidBadge } from './badge'

/**
 * Fluid Functionalism Badge — compact status label. The solid variant tints
 * the surface with a color-mix of the chosen color; the dot variant renders
 * an outlined pill with a leading color dot.
 * Pulled via `bunx shadcn@latest add @fluid/badge`.
 *
 * @example # Solid colors
 * ```tsx
 * <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
 *   <Badge>Gray</Badge>
 *   <Badge color="blue">Blue</Badge>
 *   <Badge color="green">Green</Badge>
 *   <Badge color="amber">Amber</Badge>
 *   <Badge color="red">Red</Badge>
 *   <Badge color="violet">Violet</Badge>
 * </div>
 * ```
 *
 * @example # Dot variant
 * An outlined pill with a leading color dot — for ambient statuses.
 *
 * ```tsx
 * <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
 *   <Badge variant="dot">Idle</Badge>
 *   <Badge variant="dot" color="green">Active</Badge>
 *   <Badge variant="dot" color="amber">Degraded</Badge>
 * </div>
 * ```
 *
 * @example # Compact size
 * The 20px compact step for dense surfaces like tables and sidebars.
 *
 * ```tsx
 * <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
 *   <Badge size="compact">Default 24px</Badge>
 *   <Badge size="compact" color="teal">Compact 20px</Badge>
 * </div>
 * ```
 */
export default function Badge({ color = 'gray', variant = 'solid', size = 'default', children }: {
  /** Badge color from the 17-color scale; gray uses the muted surface. @values gray, red, orange, amber, yellow, lime, green, emerald, teal, cyan, blue, indigo, violet, purple, fuchsia, pink, rose */
  color?: 'gray' | 'red' | 'orange' | 'amber' | 'yellow' | 'lime' | 'green' | 'emerald' | 'teal' | 'cyan' | 'blue' | 'indigo' | 'violet' | 'purple' | 'fuchsia' | 'pink' | 'rose'
  /** Visual style. @values solid, dot */
  variant?: 'solid' | 'dot'
  /** Height step; sm/md/lg are aliases. @values default, compact, sm, md, lg */
  size?: 'default' | 'compact' | 'sm' | 'md' | 'lg'
  /** Badge label. */
  children?: ReactNode
}) {
  return (
    <FluidBadge color={color} variant={variant} size={size}>
      {children}
    </FluidBadge>
  )
}
