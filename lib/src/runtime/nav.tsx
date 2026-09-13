import { items } from 'virtual:modo-items'
import { tokens } from 'virtual:modo-tokens'
import { shell } from 'virtual:modo-shell'

const TIERS = ['primitives', 'components', 'blocks'] as const
const cap = (s: string) => s[0]!.toUpperCase() + s.slice(1)

export function SidebarNav() {
  const path = typeof window !== 'undefined' ? window.location.pathname : '/'
  const isActive = (href: string) => path === href || (href !== '/' && path.startsWith(href))
  return (
    <>
      <NavSection title="Foundations" basePath="/docs/tokens" items={tokens.map((g) => ({ id: g.name, name: g.name }))} isActive={isActive} />
      {TIERS.map((tier) => {
        const list = items.filter((it) => it.tier === tier)
        if (!list.length) return null
        return <NavSection key={tier} title={cap(tier)} basePath={`/docs/${tier}`} items={list} isActive={isActive} />
      })}
    </>
  )
}

function NavSection({ title, basePath, items, isActive }: {
  title: string
  basePath: string
  items: ReadonlyArray<{ id: string; name: string }>
  isActive: (href: string) => boolean
}) {
  const { Item, Section } = shell.Sidebar
  return (
    <Section title={title}>
      {items.map((it) => (
        <Item key={it.id} href={`${basePath}/${it.id}`} active={isActive(`${basePath}/${it.id}`)}>
          {it.name}
        </Item>
      ))}
    </Section>
  )
}
