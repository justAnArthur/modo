import { type ItemEntry, items } from 'virtual:modo-items'
import type { Tier } from '../../lib/tiers'
import { Heading } from '../anchor'
import { groupTree } from '../groups'
import { ExamplePreview } from '../items/preview'
import { Inlines, splitLead } from '../markdown'
import { cap, count } from '../text'
import { Bento, BentoCard } from './bento'

const LEAD: Record<Tier, string> = {
  primitives: 'The smallest building blocks of this design system.',
  components: 'Composed pieces built from the primitives.',
  blocks: 'Whole sections, assembled from components.',
}

export function TierPage({ tier }: { tier: Tier }) {
  const list = items.filter(it => it.tier === tier)
  return (
    <>
      <header>
        <p data-modo="page-eyebrow">Overview</p>
        <h1 data-modo="page-title">{cap(tier)}</h1>
        <p data-modo="page-lead">
          {LEAD[tier]} {count(list.length, 'item')}.
        </p>
      </header>
      {list.length === 0 ? (
        <p>
          Nothing in <code>{tier}/</code> yet.
        </p>
      ) : (
        <Groups tier={tier} tree={groupTree(list)} level={2} />
      )}
    </>
  )
}

/** A tier's own items, then a headed section per group, nested groups one heading level down. */
function Groups({
  tier,
  tree,
  level,
}: {
  tier: Tier
  tree: ReturnType<typeof groupTree<ItemEntry>>
  level: 2 | 3 | 4
}) {
  return (
    <>
      {tree.items.length > 0 ? (
        level === 2 ? (
          <section data-modo="section">
            <Cards tier={tier} list={tree.items} />
          </section>
        ) : (
          <Cards tier={tier} list={tree.items} />
        )
      ) : null}
      {tree.groups.map(g => (
        <section key={g.title} data-modo="section">
          <Heading level={level} label={g.title} modo="section-title" />
          <Groups tier={tier} tree={g} level={level === 2 ? 3 : 4} />
        </section>
      ))}
    </>
  )
}

function Cards({ tier, list }: { tier: Tier; list: ItemEntry[] }) {
  return (
    <Bento>
      {list.map((it, i) => (
        <BentoCard
          key={it.id}
          href={`/docs/${tier}/${it.id}`}
          title={it.name}
          description={<Lead source={it.description} />}
          // Blocks are page-sized, so they take the whole row; elsewhere
          // every fifth cell widens so the grid reads as a bento.
          span={tier === 'blocks' ? 'full' : i % 5 === 0 ? 'wide' : undefined}
          zoom={tier === 'blocks' ? 0.7 : undefined}
        >
          <ExamplePreview itemId={`${tier}:${it.id}`} />
        </BentoCard>
      ))}
    </Bento>
  )
}

function Lead({ source }: { source: string }) {
  const { lead } = splitLead(source)
  return lead ? <Inlines tokens={lead.tokens} /> : null
}
