import { byId, exampleDocs, examples as examplesMap } from 'virtual:modo-items'
import { ItemExamples } from './examples'
import { PropTable } from './prop-table'
import { Blocks, Inlines, splitLead } from '../markdown'
import { Anchor } from '../anchor'
import { mdxComponents } from '../mdx'

export function ItemPage({ tier, id }: { tier: 'primitives' | 'components' | 'blocks'; id: string }) {
  const entry = byId[`${tier}:${id}`]
  if (!entry) {
    return (
      <article>
        <h1 data-modo="page-title">{tier}/{id}</h1>
        <p data-modo="page-lead">Item not found.</p>
      </article>
    )
  }
  const { lead, body } = splitLead(entry.description)
  const examples = examplesMap[`${tier}:${id}`] ?? []
  const ExamplesDoc = exampleDocs[`${tier}:${id}`]
  return (
    <article>
      <header>
        <p data-modo="page-eyebrow">{tier[0]!.toUpperCase() + tier.slice(1)}</p>
        <h1 data-modo="page-title">{entry.name}</h1>
        {lead ? <p data-modo="page-lead"><Inlines tokens={lead.tokens} /></p> : null}
      </header>
      {body.length > 0 ? (
        <div data-modo="prose">
          <Blocks tokens={body} />
        </div>
      ) : null}
      {examples.length > 0 || ExamplesDoc ? (
        <ItemExamples examples={examples}>
          {ExamplesDoc ? <ExamplesDoc components={mdxComponents} /> : null}
        </ItemExamples>
      ) : null}
      <section data-modo="section">
        <h2 data-modo="section-title" id="props">Props<Anchor id="props" label="Props" /></h2>
        <PropTable itemId={`${tier}:${id}`} />
      </section>
    </article>
  )
}
