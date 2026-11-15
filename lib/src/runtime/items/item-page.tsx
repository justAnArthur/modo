import { byId } from 'virtual:modo-items'
import { itemKey } from '../../lib/paths'
import { cap } from '../../lib/text'
import type { Tier } from '../../lib/tiers'
import { Heading } from '../anchor'
import { Blocks, Inlines, splitLead } from '../markdown'
import { mdxComponents } from '../mdx'
import { NotFoundPage } from '../pages/not-found'
import { ExampleBoundary, ItemExamples } from './examples'
import { PageMeta } from './page-meta'
import { PropTable } from './prop-table'

export function ItemPage({ tier, id }: { tier: Tier; id: string }) {
  const entry = byId[itemKey(tier, id)]
  if (!entry) return <NotFoundPage />
  const { lead, body } = splitLead(entry.description)
  const { examples, mdxExamples } = entry
  return (
    <article>
      <header>
        <p data-modo="page-eyebrow">{cap(tier)}</p>
        <h1 data-modo="page-title">{entry.name}</h1>
        {lead ? (
          <p data-modo="page-lead">
            <Inlines tokens={lead.tokens} />
          </p>
        ) : null}
        <PageMeta entry={entry} />
      </header>
      {body.length > 0 ? (
        <div data-modo="prose">
          <Blocks tokens={body} />
        </div>
      ) : null}
      {examples.length > 0 || mdxExamples.length > 0 ? (
        <ItemExamples examples={examples}>
          {mdxExamples.map((Doc, i) => (
            <div data-modo="prose" key={i}>
              {/* A broken .mdx (an unbound tag, a dropped item) stays in its box. */}
              <ExampleBoundary>
                <Doc components={mdxComponents} />
              </ExampleBoundary>
            </div>
          ))}
        </ItemExamples>
      ) : null}
      <section data-modo="section">
        <Heading level={2} label="Props" modo="section-title" />
        <PropTable props={entry.props} />
      </section>
    </article>
  )
}
