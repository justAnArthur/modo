import { items } from 'virtual:modo-items'
import { tokens } from 'virtual:modo-tokens'
import { config } from 'virtual:modo-config'
import { shell } from 'virtual:modo-shell'

const TIERS = ['primitives', 'components', 'blocks'] as const
const cap = (s: string) => s[0]!.toUpperCase() + s.slice(1)

export function SidebarNav() {
  const path = typeof window !== 'undefined' ? window.location.pathname : '/'
  const isActive = (href: string) => path === href || (href !== '/' && path.startsWith(href))
  return (
    <>
      <NavSection title={config.name} items={[{ id: '/', name: 'Overview' }]} isActive={isActive} />
      <NavSection
        title="Foundations"
        overview="/docs/tokens"
        basePath="/docs/tokens"
        items={tokens.map((g) => ({ id: g.name, name: g.name }))}
        isActive={isActive}
      />
      {TIERS.map((tier) => {
        const list = items.filter((it) => it.tier === tier)
        if (!list.length) return null
        return (
          <NavSection
            key={tier}
            title={cap(tier)}
            overview={`/docs/${tier}`}
            basePath={`/docs/${tier}`}
            items={list}
            isActive={isActive}
          />
        )
      })}
    </>
  )
}

function NavSection({ title, basePath, overview, items, isActive }: {
  title: string
  basePath?: string
  /** Section landing page, listed first — the per-item links follow. */
  overview?: string
  items: ReadonlyArray<{ id: string; name: string }>
  isActive: (href: string) => boolean
}) {
  const { Item, Section } = shell.Sidebar
  const href = (id: string) => (basePath ? `${basePath}/${id}` : id)
  return (
    <Section title={title}>
      {overview ? (
        <Item href={overview} active={isActive(overview) && !items.some((it) => isActive(href(it.id)))}>
          All {title.toLowerCase()}
        </Item>
      ) : null}
      {items.map((it) => (
        <Item key={it.id} href={href(it.id)} active={isActive(href(it.id))}>
          {it.name}
        </Item>
      ))}
    </Section>
  )
}
