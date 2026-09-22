import { tokens } from 'virtual:modo-tokens'
import { Bento, BentoCard } from './bento'
import { GroupPreview } from '../tokens/token-page'

export function TokensPage() {
  return (
    <main data-modo="content">
      <header data-modo="tokens-header">
        <h1 data-modo="page-title">Foundations</h1>
        <span data-modo="tokens-count">{tokens.length} groups</span>
      </header>
      <p data-modo="page-lead">Every custom property this design system ships, by group.</p>
      {tokens.length === 0 ? (
        <p>No <code>tokens/*.css</code> files found.</p>
      ) : (
        <Bento>
          {tokens.map((g, i) => (
            <BentoCard
              key={g.name}
              href={`/docs/tokens/${g.name}`}
              title={g.name}
              meta={`${g.vars.length} variables`}
              span={g.name === 'colors' || i % 5 === 0 ? 'wide' : undefined}
            >
              <GroupPreview group={g.name} />
            </BentoCard>
          ))}
        </Bento>
      )}
    </main>
  )
}
