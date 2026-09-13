import type { ReactNode } from 'react'
import './link.css'

export default function Link({ href, children, className, ...rest }: { href: string; children?: ReactNode; className?: string; [key: string]: unknown }) {
  const cls = ['shell-link', className].filter(Boolean).join(' ')
  return (
    <a data-aui="shell-link" href={href} className={cls} {...rest}>
      {children}
    </a>
  )
}
