import { config } from 'virtual:modo-config'
import { guides } from 'virtual:modo-guides'
import { items } from 'virtual:modo-items'
import { shell } from 'virtual:modo-shell'
import { tokens } from 'virtual:modo-tokens'
import { guidePath, tierPath, tokenPath } from '../../lib/paths'
import { cap, count } from '../../lib/text'
import { isScreenSized, TIERS } from '../../lib/tiers'
import { ExamplePreview, hasPreview } from '../items/preview'
import { withBase } from '../location'
import { GroupPreview } from '../tokens/group-page'
import { declared } from '../tokens/parts'
import { Bento, BentoCard } from './bento'
import { Credits } from './credits'

export function HomePage() {
  // Light and dark blocks declare a token twice; count it once.
  const vars = tokens.reduce((n, g) => n + declared(g.vars).length, 0)
  return (
    <>
      <header data-modo="hero">
        <h1 data-modo="page-title">{config.name}</h1>
        <p data-modo="page-lead">
          {config.description ?? 'Tokens, primitives, components, blocks, and pages in this design system.'}
        </p>
        <p data-modo="hero-stats">
          {count(vars, 'token')} · {count(items.length, 'item')}
        </p>
      </header>
      <Bento>
        {guides.length > 0 && (
          <BentoCard href={guidePath(guides[0]!.slug)} title="Guides" meta={count(guides.length, 'guide')}>
            <ol data-modo="guide-list">
              {guides.map(g => (
                <li key={g.slug}>
                  <shell.Link href={withBase(guidePath(g.slug))}>{g.title}</shell.Link>
                </li>
              ))}
            </ol>
          </BentoCard>
        )}
        {tokens.length > 0 && (
          <BentoCard href={tokenPath()} title="Foundations" meta={count(tokens.length, 'group')} span="wide">
            <GroupPreview group={tokens[0]!.name} />
          </BentoCard>
        )}
        {TIERS.map(tier => {
          const list = items.filter(it => it.tier === tier)
          if (list.length === 0) return null
          const shown = list.find(hasPreview) ?? list[0]!
          return (
            <BentoCard
              key={tier}
              href={tierPath(tier)}
              title={cap(tier)}
              meta={count(list.length, 'item')}
              description={list.map(it => it.name).join(', ')}
              span={isScreenSized(tier) ? 'full' : undefined}
              zoom={isScreenSized(tier) ? 0.7 : undefined}
            >
              <ExamplePreview entry={shown} />
            </BentoCard>
          )
        })}
      </Bento>
      <Credits />
    </>
  )
}
