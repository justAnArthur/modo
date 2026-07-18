// a tiny <Link> wrapper. uses the user's <Link> if provided via
// modo.config.ts components.Link, otherwise falls back to native <a>.
// the lib does not ship a router — vike handles client navigation,
// so the user's <Link> is responsible for preserving the `href` (e.g.
// with their own router integration).

import type { AnchorHTMLAttributes, ComponentType } from 'react'
import { Link as UserLink } from 'virtual:modo-components'

type AnyProps = Record<string, unknown> & AnchorHTMLAttributes<HTMLAnchorElement>

export function Link(props: AnyProps) {
  if (UserLink) {
    const C = UserLink as ComponentType<AnyProps>
    return <C {...props} />
  }
  return <a {...props} />
}
