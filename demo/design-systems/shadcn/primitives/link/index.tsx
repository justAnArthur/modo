import type { ReactNode } from 'react'
import { Link as ShadcnLink } from './link'

/**
 * shadcn/ui-style Link — an anchor styled with the Button's `buttonVariants()`,
 * the pattern documented in the shadcn/ui Link docs (ui.shadcn.com).
 * Authored for this showcase (shadcn ships no Link component).
 *
 * {@include ./link.mdx}
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
