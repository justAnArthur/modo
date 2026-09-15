import { byId, examples as examplesMap } from 'virtual:modo-items'
import { ItemExamples } from './examples'
import { PropTable } from './prop-table'

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
  return (
    <article>
      <header>
        <h1 data-modo="page-title">{entry.name}</h1>
        {entry.description ? <p data-modo="page-lead">{entry.description}</p> : null}
      </header>
      <ItemExamples examples={examplesMap[`${tier}:${id}`] ?? []} componentName={entry.name} />
      <section data-modo="section">
        <h2 data-modo="section-title">Props</h2>
        <PropTable itemId={`${tier}:${id}`} />
      </section>
    </article>
  )
}
