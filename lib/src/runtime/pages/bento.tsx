import type { ReactNode } from 'react'
import { shell } from 'virtual:modo-shell'

/** One bento cell: a live preview over a labelled footer. `wide` cells span
    two columns once the content column is wide enough (see shell.css). */
export function BentoCard({ href, title, meta, description, span, zoom, children }: {
  href: string
  title: string
  meta?: string
  description?: string
  /** 'wide' spans two columns, 'full' the whole row (page-sized previews). */
  span?: 'wide' | 'full'
  /** Shrink an oversized preview (a block) to fit the cell. */
  zoom?: number
  children?: ReactNode
}) {
  const { Link } = shell
  return (
    <article data-modo="bento-card" data-span={span}>
      <div data-modo="bento-stage" style={zoom ? { ['--modo-stage-zoom' as string]: zoom } : undefined}>{children}</div>
      <div data-modo="bento-meta">
        <span data-modo="bento-title">
          <Link href={href}>{title}</Link>
        </span>
        {meta ? <span data-modo="bento-count">{meta}</span> : null}
        {description ? <p data-modo="bento-desc">{description.split('\n')[0]}</p> : null}
      </div>
    </article>
  )
}

export function Bento({ children }: { children: ReactNode }) {
  return <div data-modo="bento">{children}</div>
}
