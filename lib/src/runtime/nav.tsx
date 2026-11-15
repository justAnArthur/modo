import { items } from 'virtual:modo-items'
import { shell } from 'virtual:modo-shell'
import { tokens } from 'virtual:modo-tokens'
import type { ReactNode } from 'react'
import { itemPath, tierPath, tokenPath } from '../lib/paths'
import { cap } from '../lib/text'
import { TIERS } from '../lib/tiers'
import { groupTree } from './groups'
import { HOME_PATH, staticPage, usePath, withBase } from './location'

export function SidebarNav() {
  const path = usePath()
  const isActive = (href: string) => path === href || path.startsWith(`${href}/`)
  return (
    <>
      <NavSection
        // The header already names the system.
        title="Explore"
        items={[
          { id: HOME_PATH, name: 'Overview' },
          { id: staticPage('canvas').href, name: staticPage('canvas').title },
        ]}
        isActive={isActive}
      />
      <NavSection
        title="Foundations"
        overview={tokenPath()}
        href={tokenPath}
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
            overview={tierPath(tier)}
            href={id => itemPath(tier, id)}
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
  href = id => id,
  overview,
  items,
  isActive,
}: {
  title: string
  /** An item's app path; by default its id is one. */
  href?: (id: string) => string
  /** The section's landing page, listed before its items. */
  overview?: string
  items: ReadonlyArray<{ id: string; name: string; group?: string }>
  isActive: (href: string) => boolean
}) {
  const { Item, Section } = shell.Sidebar
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
