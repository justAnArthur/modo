import { items } from 'virtual:modo-items'
import { Bento, BentoCard } from './bento'
import { ExamplePreview } from '../items/preview'

export type Tier = 'primitives' | 'components' | 'blocks'

const LEAD: Record<Tier, string> = {
  primitives: 'The smallest building blocks of this design system.',
  components: 'Composed pieces built from the primitives.',
  blocks: 'Whole sections, assembled from components.',
}

export function TierPage({ tier }: { tier: Tier }) {
  const list = items.filter((it) => it.tier === tier)
  return (
    <main data-modo="content">
      <header data-modo="tokens-header">
        <h1 data-modo="page-title">{tier}</h1>
        <span data-modo="tokens-count">{list.length} items</span>
      </header>
      <p data-modo="page-lead">{LEAD[tier]}</p>
      {list.length === 0 ? (
        <p>Nothing in <code>{tier}/</code> yet.</p>
      ) : (
        <Bento>
          {list.map((it, i) => (
            <BentoCard
              key={it.id}
              href={`/docs/${tier}/${it.id}`}
              title={it.name}
              description={it.description}
              // Blocks are page-sized, so they take the whole row; elsewhere
              // every fifth cell widens so the grid reads as a bento.
              span={tier === 'blocks' ? 'full' : i % 5 === 0 ? 'wide' : undefined}
              zoom={tier === 'blocks' ? 0.7 : undefined}
            >
              <ExamplePreview itemId={`${tier}:${it.id}`} />
            </BentoCard>
          ))}
        </Bento>
      )}
    </main>
  )
}
