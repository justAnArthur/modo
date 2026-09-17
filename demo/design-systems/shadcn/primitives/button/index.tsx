import type { ReactNode } from 'react'
import { Button as ShadcnButton } from './button'

/**
 * shadcn/ui Button — primary action trigger.
 * Pulled via `bunx shadcn@latest add button` (radix-nova style, neutral base color).
 *
 * @example # Variants
 * The six visual styles of the radix-nova button.
 *
 * ```tsx
 * <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
 *   <Button>Default</Button>
 *   <Button variant="secondary">Secondary</Button>
 *   <Button variant="outline">Outline</Button>
 *   <Button variant="ghost">Ghost</Button>
 *   <Button variant="destructive">Destructive</Button>
 *   <Button variant="link">Link</Button>
 * </div>
 * ```
 *
 * @example # Sizes
 * Height presets from xs to lg.
 *
 * ```tsx
 * <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
 *   <Button size="xs">Extra small</Button>
 *   <Button size="sm">Small</Button>
 *   <Button>Default</Button>
 *   <Button size="lg">Large</Button>
 * </div>
 * ```
 *
 * @example # Icon sizes
 * Square icon buttons; any child svg is sized automatically.
 *
 * ```tsx
 * <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
 *   <Button size="icon-xs" aria-label="Extra small icon">+</Button>
 *   <Button size="icon-sm" aria-label="Small icon">+</Button>
 *   <Button size="icon" aria-label="Icon">+</Button>
 *   <Button size="icon-lg" aria-label="Large icon">+</Button>
 * </div>
 * ```
 *
 * @example # Disabled
 * ```tsx
 * <Button disabled>Cannot click</Button>
 * ```
 */
export default function Button({ variant = 'default', size = 'default', disabled = false, onClick, children }: {
  /** Visual style. @values default, destructive, outline, secondary, ghost, link */
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
  /** Control size. @values default, xs, sm, lg, icon, icon-xs, icon-sm, icon-lg */
  size?: 'default' | 'xs' | 'sm' | 'lg' | 'icon' | 'icon-xs' | 'icon-sm' | 'icon-lg'
  /** Disables the button. */
  disabled?: boolean
  /** Click handler. */
  onClick?: () => void
  /** Label. */
  children?: ReactNode
}) {
  return (
    <ShadcnButton variant={variant} size={size} disabled={disabled} onClick={onClick}>
      {children}
    </ShadcnButton>
  )
}
