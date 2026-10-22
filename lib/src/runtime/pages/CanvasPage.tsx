import { type ItemEntry, items } from 'virtual:modo-items'
import { shell } from 'virtual:modo-shell'
import { tokens } from 'virtual:modo-tokens'
import { type CSSProperties, type ReactNode, useRef } from 'react'
import { TIERS } from '../../lib/tiers'
import { useLive, Viewport } from '../canvas/viewport'
import { groupTree } from '../groups'
import { ExamplePreview } from '../items/preview'
import { withBase } from '../router'
import { cap } from '../text'
import { GroupPreview } from '../tokens/token-page'

/** Every foundation and item, live, on one pan-and-zoom surface: a column per
    tier in sidebar order, a frame per page. */
export function CanvasPage() {
  return (
    <Viewport>
      {tokens.length > 0 && (
        <Column kind="foundations" title="Foundations" size={tokens.length}>
          {tokens.map(g => (
            <Frame key={g.name} href={`/docs/tokens/${g.name}`} title={cap(g.name)}>
              <GroupPreview group={g.name} />
            </Frame>
          ))}
        </Column>
      )}
      {TIERS.map(tier => {
        const list = flatten(groupTree(items.filter(it => it.tier === tier)))
        if (list.length === 0) return null
        return (
          <Column key={tier} kind={tier} title={cap(tier)} size={list.length}>
            {list.map(it => (
              <Frame key={it.id} href={`/docs/${tier}/${it.id}`} title={it.name}>
                <ExamplePreview itemId={`${tier}:${it.id}`} />
              </Frame>
            ))}
          </Column>
        )
      })}
    </Viewport>
  )
}

function flatten(tree: ReturnType<typeof groupTree<ItemEntry>>): ItemEntry[] {
  return [...tree.items, ...tree.groups.flatMap(flatten)]
}

function Column({ kind, title, size, children }: { kind: string; title: string; size: number; children: ReactNode }) {
  // A roughly square block of frames; page-sized blocks stay two across.
  const cols = Math.min(kind === 'blocks' ? 2 : 6, Math.ceil(Math.sqrt(size)))
  return (
    <section data-modo="canvas-column" data-kind={kind} style={{ '--modo-canvas-cols': cols } as CSSProperties}>
      <h2 data-modo="section-title">{title}</h2>
      <div data-modo="canvas-frames">{children}</div>
    </section>
  )
}

function Frame({ href, title, children }: { href: string; title: string; children: ReactNode }) {
  const { Link } = shell
  const ref = useRef<HTMLElement>(null)
  const live = useLive(ref)
  return (
    <article ref={ref} data-modo="canvas-frame">
      <span data-modo="canvas-frame-title">
        <Link href={withBase(href)}>{title}</Link>
      </span>
      <div data-modo="canvas-stage">{live ? children : null}</div>
    </article>
  )
}
