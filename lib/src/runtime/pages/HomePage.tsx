import { items } from 'virtual:modo-items'
import { tokens } from 'virtual:modo-tokens'
import { config } from 'virtual:modo-config'
import { Bento, BentoCard } from './bento'
import { ExamplePreview } from '../items/preview'
import { GroupPreview } from '../tokens/token-page'
import type { Tier } from './TierPage'

const TIERS: Tier[] = ['primitives', 'components', 'blocks']

export function HomePage() {
  const vars = tokens.reduce((n, g) => n + g.vars.length, 0)
  return (
    <main data-modo="content">
      <header data-modo="hero">
        <h1 data-modo="page-title">{config.name}</h1>
        <p data-modo="page-lead">
          {config.description ?? 'Tokens, primitives, components, and blocks in this design system.'}
        </p>
        <p data-modo="hero-stats">
          {vars} tokens · {items.length} items
        </p>
      </header>
      <Bento>
        {tokens.length > 0 && (
          <BentoCard href="/docs/tokens" title="Foundations" meta={`${tokens.length} groups`} span="wide">
            <GroupPreview group={tokens[0]!.name} />
          </BentoCard>
        )}
        {TIERS.map((tier) => {
          const list = items.filter((it) => it.tier === tier)
          if (list.length === 0) return null
          const first = list[0]!
          return (
            <BentoCard
              key={tier}
              href={`/docs/${tier}`}
              title={tier}
              meta={`${list.length} items`}
              description={list.map((it) => it.name).join(', ')}
              span={tier === 'blocks' ? 'full' : undefined}
              zoom={tier === 'blocks' ? 0.7 : undefined}
            >
              <ExamplePreview itemId={`${tier}:${first.id}`} />
            </BentoCard>
          )
        })}
      </Bento>
    </main>
  )
}
