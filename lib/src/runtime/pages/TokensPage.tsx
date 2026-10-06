import { tokens } from 'virtual:modo-tokens'
import { cap, count } from '../text'
import { GroupPreview } from '../tokens/token-page'
import { declared } from '../tokens/token-row'
import { Bento, BentoCard } from './bento'

export function TokensPage() {
  return (
    <>
      <header>
        <p data-modo="page-eyebrow">Overview</p>
        <h1 data-modo="page-title">Foundations</h1>
        <p data-modo="page-lead">Every custom property this design system ships, in {count(tokens.length, 'group')}.</p>
      </header>
      {tokens.length === 0 ? (
        <p>
          No <code>tokens/*.css</code> files found.
        </p>
      ) : (
        <Bento>
          {tokens.map((g, i) => (
            <BentoCard
              key={g.name}
              href={`/docs/tokens/${g.name}`}
              title={cap(g.name)}
              meta={count(declared(g.vars).length, 'variable')}
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
