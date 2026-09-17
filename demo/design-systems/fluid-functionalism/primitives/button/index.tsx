import type { ReactNode } from 'react'
import { Button as FluidButton } from './button'

/**
 * Fluid Functionalism Button — the system's primary action trigger, with a
 * 1px press-collapse (box-shadow spread, not scale), fluid hover states, and
 * Inter variable font-weight transitions on hover. Pulled via
 * `bunx shadcn@latest add @fluid/button`.
 *
 * @example # Variants
 * The four @fluid styles: primary fill, secondary accent, tertiary outline, ghost.
 *
 * ```tsx
 * <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
 *   <Button>Primary</Button>
 *   <Button variant="secondary">Secondary</Button>
 *   <Button variant="tertiary">Tertiary</Button>
 *   <Button variant="ghost">Ghost</Button>
 * </div>
 * ```
 *
 * @example # Sizes
 * The two-step size ladder: default 36px, compact 28px for dense surfaces. The sm/md/lg aliases resolve onto it.
 *
 * ```tsx
 * <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
 *   <Button size="compact">Compact</Button>
 *   <Button>Default</Button>
 *   <Button size="sm">Small (alias)</Button>
 *   <Button size="lg">Large (alias)</Button>
 * </div>
 * ```
 *
 * @example # Icon buttons
 * Square icon sizes; any child svg is sized automatically.
 *
 * ```tsx
 * <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
 *   <Button size="icon-compact" aria-label="Compact icon">+</Button>
 *   <Button size="icon" aria-label="Icon">+</Button>
 * </div>
 * ```
 *
 * @example # Loading and disabled
 * The loading spinner replaces the label while keeping the button's width stable.
 *
 * ```tsx
 * <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
 *   <Button loading>Sending</Button>
 *   <Button disabled>Cannot click</Button>
 * </div>
 * ```
 */
export default function Button({ variant = 'primary', size = 'default', loading = false, disabled = false, onClick, children }: {
  /** Visual style. @values primary, secondary, tertiary, ghost */
  variant?: 'primary' | 'secondary' | 'tertiary' | 'ghost'
  /** Control size; sm/md/lg are aliases onto the two-step ladder. @values default, compact, sm, md, lg, icon, icon-compact, icon-sm, icon-lg */
  size?: 'default' | 'compact' | 'sm' | 'md' | 'lg' | 'icon' | 'icon-compact' | 'icon-sm' | 'icon-lg'
  /** Swaps the label for the built-in spinner and disables the button. */
  loading?: boolean
  /** Disables the button. */
  disabled?: boolean
  /** Click handler. */
  onClick?: () => void
  /** Label. */
  children?: ReactNode
}) {
  return (
    <FluidButton variant={variant} size={size} loading={loading} disabled={disabled} onClick={onClick}>
      {children}
    </FluidButton>
  )
}
