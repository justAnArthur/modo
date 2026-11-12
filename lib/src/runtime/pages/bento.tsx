import { shell } from 'virtual:modo-shell'
import { type ReactNode, type RefObject, useLayoutEffect, useRef } from 'react'
import { withBase } from '../router'

/** Below this a preview stops shrinking and is clipped (with a fade) instead. */
const MIN_ZOOM = 0.4

/** One bento cell: a live preview over a labelled footer. `wide` cells span
    two columns once the content column is wide enough (see shell.css). */
export function BentoCard({
  href,
  title,
  meta,
  description,
  span,
  zoom = 1,
  children,
}: {
  href: string
  title: string
  meta?: string
  description?: ReactNode
  /** 'wide' spans two columns, 'full' the whole row (page-sized previews). */
  span?: 'wide' | 'full'
  /** The preview's starting scale; a preview that still overflows the cell shrinks further. */
  zoom?: number
  children?: ReactNode
}) {
  const { Link } = shell
  const stage = useRef<HTMLDivElement>(null)
  const fit = useRef<HTMLDivElement>(null)
  useFit(stage, fit, zoom)
  return (
    <article data-modo="bento-card" data-span={span}>
      <div ref={stage} data-modo="bento-stage">
        <div ref={fit} data-modo="bento-fit">
          {children}
        </div>
      </div>
      <div data-modo="bento-meta">
        <span data-modo="bento-title">
          <Link href={withBase(href)}>{title}</Link>
        </span>
        {meta ? <span data-modo="bento-count">{meta}</span> : null}
        {description ? <p data-modo="bento-desc">{description}</p> : null}
      </div>
    </article>
  )
}

/** Scales the preview down until it fits the stage, refitting whenever either resizes. */
function useFit(stage: RefObject<HTMLDivElement | null>, fit: RefObject<HTMLDivElement | null>, base: number) {
  useLayoutEffect(() => {
    const outer = stage.current!
    const inner = fit.current!
    let frame = 0
    const run = () => {
      frame = 0
      fitInto(outer, inner, base)
    }
    run()
    // Deferred to the next frame: refitting inside the callback would resize
    // what it observes and trip the observer's loop guard.
    const observer = new ResizeObserver(() => {
      frame ||= requestAnimationFrame(run)
    })
    observer.observe(outer)
    observer.observe(inner)
    return () => {
      observer.disconnect()
      cancelAnimationFrame(frame)
    }
  }, [stage, fit, base])
}

function fitInto(stage: HTMLElement, fit: HTMLElement, base: number) {
  const style = getComputedStyle(stage)
  const room = parseFloat(style.maxHeight) - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom)
  // Shrinking widens the preview's own layout, which reflows it: a few passes converge.
  let zoom = base
  for (let pass = 0; pass < 4; pass++) {
    fit.style.setProperty('--modo-stage-zoom', String(zoom))
    const scale = Math.min(fit.clientWidth / fit.scrollWidth, room / fit.getBoundingClientRect().height)
    if (scale >= 0.98 || zoom === MIN_ZOOM) break
    zoom = Math.max(MIN_ZOOM, zoom * scale)
  }
  // The fade runs along the bottom edge, so only a cut-off height earns it.
  stage.toggleAttribute('data-clipped', fit.getBoundingClientRect().height > room + 1)
}

export function Bento({ children }: { children: ReactNode }) {
  const grid = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const el = grid.current!
    pack(el)
    const observer = new ResizeObserver(() => pack(el))
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  return (
    <div ref={grid} data-modo="bento">
      {children}
    </div>
  )
}

/** Gives each card its span for the current column count, widening the last
    card of a row that the next one can't share, so no row ends in a hole. */
function pack(grid: HTMLElement) {
  const cols = getComputedStyle(grid).gridTemplateColumns.split(' ').length
  let free = cols
  let last: { card: HTMLElement; span: number } | undefined
  const widen = () => {
    if (last && free < cols) last.card.style.gridColumn = `span ${last.span + free}`
    free = cols
  }
  for (const card of grid.children as HTMLCollectionOf<HTMLElement>) {
    const span = Math.min(cols, card.dataset.span === 'full' ? cols : card.dataset.span === 'wide' ? 2 : 1)
    if (span > free) widen()
    card.style.gridColumn = `span ${span}`
    last = { card, span }
    free -= span
    if (free === 0) free = cols
  }
  widen()
}
