// a tiny <Link> wrapper that uses the native <a> tag (the lib does not
// ship a router; vike handles client navigation). styling is via data-aui.
import type { AnchorHTMLAttributes } from 'react'

export function Link(props: AnchorHTMLAttributes<HTMLAnchorElement>) {
  return <a {...props} />
}
