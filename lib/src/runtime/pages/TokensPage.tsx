import { tokens } from 'virtual:modo-tokens'
import { cap, count } from '../text'
import { about, GroupPreview, summary } from '../tokens/token-page'
import { declared } from '../tokens/token-row'
import { Bento, BentoCard } from './bento'

export function TokensPage() {
  return (
    <>
      <header>
        <p data-modo="page-eyebrow">Overview</p>
        <h1 data-modo="page-title">Foundations</h1>
        <p data-modo="page-lead">
          The tokens every component is built from, in {count(tokens.length, 'group')}, each rendered with this design
          system's own values.
        </p>
      </header>
      {tokens.length === 0 ? (
        <p data-modo="token-empty">
          No <code>tokens/*.css</code> files found.
        </p>
      ) : (
        <Bento>
          {tokens.map((g, i) => (
            <BentoCard
              key={g.name}
              href={`/docs/tokens/${g.name}`}
              title={cap(g.name)}
              meta={summary(g.name, declared(g.vars))}
              description={about(g.name)}
              span={g.name === 'colors' || i % 5 === 0 ? 'wide' : undefined}
            >
              <GroupPreview group={g.name} />
            </BentoCard>
          ))}
        </Bento>
      )}
    </>
  )
}
