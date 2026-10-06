import { config } from 'virtual:modo-config'
import { items } from 'virtual:modo-items'
import { tokens } from 'virtual:modo-tokens'
import { TIERS } from '../../lib/tiers'
import { ExamplePreview, hasPreview } from '../items/preview'
import { cap, count } from '../text'
import { GroupPreview } from '../tokens/token-page'
import { declared } from '../tokens/token-row'
import { Bento, BentoCard } from './bento'

export function HomePage() {
  // Light and dark blocks declare a token twice; count it once.
  const vars = tokens.reduce((n, g) => n + declared(g.vars).length, 0)
  return (
    <>
      <header data-modo="hero">
        <h1 data-modo="page-title">{config.name}</h1>
        <p data-modo="page-lead">
          {config.description ?? 'Tokens, primitives, components, and blocks in this design system.'}
        </p>
        <p data-modo="hero-stats">
          {count(vars, 'token')} · {count(items.length, 'item')}
        </p>
      </header>
      <Bento>
        {tokens.length > 0 && (
          <BentoCard href="/docs/tokens" title="Foundations" meta={count(tokens.length, 'group')} span="wide">
            <GroupPreview group={tokens[0]!.name} />
          </BentoCard>
        )}
        {TIERS.map(tier => {
          const list = items.filter(it => it.tier === tier)
          if (list.length === 0) return null
          const shown = list.find(it => hasPreview(`${tier}:${it.id}`)) ?? list[0]!
          return (
            <BentoCard
              key={tier}
              href={`/docs/${tier}`}
              title={cap(tier)}
              meta={count(list.length, 'item')}
              description={list.map(it => it.name).join(', ')}
              span={tier === 'blocks' ? 'full' : undefined}
              zoom={tier === 'blocks' ? 0.7 : undefined}
            >
              <ExamplePreview itemId={`${tier}:${shown.id}`} />
            </BentoCard>
          )
        })}
      </Bento>
    </>
  )
}
