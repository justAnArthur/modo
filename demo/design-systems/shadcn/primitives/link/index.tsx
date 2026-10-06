import type { ReactNode } from 'react'
import { buttonVariants } from '../button'

/**
 * shadcn/ui-style Link — an inline text link, or with a button `variant` an
 * anchor styled by the Button's `buttonVariants()`, the pattern documented in
 * the shadcn/ui Link docs (ui.shadcn.com). Authored for this showcase (shadcn
 * ships no Link component). Also the docs chrome's Link, which passes
 * `aria-label` on icon-only heading anchors and `title` from Markdown links.
 *
 * @example {@include ./examples.mdx}
 */
export default function Link({
  href,
  variant = 'link',
  children,
  ...rest
}: {
  /** Navigation target. */
  href: string
  /** Visual style: `link` is plain text, the rest reuse the Button variants. @values link, default, destructive, outline, secondary, ghost */
  variant?: 'link' | 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost'
  /** Link label. */
  children?: ReactNode
  'aria-label'?: string
  /** Tooltip text. */
  title?: string
}) {
  const className = variant === 'link' ? 'text-primary underline-offset-4 hover:underline' : buttonVariants({ variant })
  return (
    <a data-slot="link" href={href} className={className} {...rest}>
      {children}
    </a>
  )
}
