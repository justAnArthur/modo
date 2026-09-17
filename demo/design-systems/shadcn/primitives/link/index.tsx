import type { ReactNode } from 'react'
import { Link as ShadcnLink } from './link'

/**
 * shadcn/ui-style Link — an anchor styled with the Button's `buttonVariants()`,
 * the pattern documented in the shadcn/ui Link docs (ui.shadcn.com).
 * Authored for this showcase (shadcn ships no Link component).
 *
 * @example # Text link
 * The `link` variant renders a classic inline hyperlink.
 *
 * ```tsx
 * <Link href="https://ui.shadcn.com">ui.shadcn.com</Link>
 * ```
 *
 * @example # As a button
 * Any button variant turns the anchor into a button-styled call to action.
 *
 * ```tsx
 * <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
 *   <Link href="https://ui.shadcn.com">ui.shadcn.com</Link>
 *   <Link href="#docs" variant="outline">Read the docs</Link>
 *   <Link href="#get-started" variant="secondary">Get started</Link>
 * </div>
 * ```
 */
export default function Link({ href, variant = 'link', children }: {
  /** Navigation target. */
  href: string
  /** Visual style, reused from the Button variants. @values link, default, destructive, outline, secondary, ghost */
  variant?: 'link' | 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost'
  /** Link label. */
  children?: ReactNode
}) {
  return (
    <ShadcnLink href={href} variant={variant}>
      {children}
    </ShadcnLink>
  )
}
