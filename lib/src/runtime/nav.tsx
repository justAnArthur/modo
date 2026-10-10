import { config } from 'virtual:modo-config'
import { items } from 'virtual:modo-items'
import { shell } from 'virtual:modo-shell'
import { tokens } from 'virtual:modo-tokens'
import type { ReactNode } from 'react'
import { TIERS } from '../lib/tiers'
import { groupTree } from './groups'
import { usePath, withBase } from './router'
import { cap } from './text'

export function SidebarNav() {
  const path = usePath()
  const isActive = (href: string) => path === href || path.startsWith(`${href}/`)
  return (
    <>
      <NavSection title={config.name} items={[{ id: '/', name: 'Overview' }]} isActive={isActive} />
      <NavSection
        title="Foundations"
        overview="/docs/tokens"
        basePath="/docs/tokens"
        items={tokens.map(g => ({ id: g.name, name: cap(g.name) }))}
        isActive={isActive}
      />
      {TIERS.map(tier => {
        const list = items.filter(it => it.tier === tier)
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

function NavSection({
  title,
  basePath,
  overview,
  items,
  isActive,
}: {
  title: string
  basePath?: string
  /** Section landing page, listed first — the per-item links follow. */
  overview?: string
  items: ReadonlyArray<{ id: string; name: string; group?: string }>
  isActive: (href: string) => boolean
}) {
  const { Item, Section } = shell.Sidebar
  const href = (id: string) => (basePath ? `${basePath}/${id}` : id)
  const link = (it: { id: string; name: string }) => (
    <Item key={it.id} href={withBase(href(it.id))} active={isActive(href(it.id))}>
      {it.name}
    </Item>
  )
  return (
    <Section title={title}>
      {overview ? (
        <Item href={withBase(overview)} active={isActive(overview) && !items.some(it => isActive(href(it.id)))}>
          All {title.toLowerCase()}
        </Item>
      ) : null}
      {groups(groupTree(items))}
    </Section>
  )

  // A plain function, not a component: a host's Section may inspect its
  // children for Items and Sections.
  function groups(tree: ReturnType<typeof groupTree<(typeof items)[number]>>): ReactNode[] {
    return [
      ...tree.items.map(link),
      ...tree.groups.map(g => (
        <Section key={g.title} title={g.title}>
          {groups(g)}
        </Section>
      )),
    ]
  }
}
