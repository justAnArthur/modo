// shared per-item page. used by /docs/{primitives,components,blocks}/@id.
// the per-tier +Page.tsx is just a tiny wrapper that picks the category
// and lets the dynamic route param drive the key.

import { usePageContext } from 'vike-react/usePageContext'
import { byId, components as itemComponents, examples as itemExamples } from 'virtual:modo-items'
import { ExampleBlock } from './example-renderer'

type Tier = 'primitives' | 'components' | 'blocks'

const TIER_LABEL: Record<Tier, string> = {
  primitives: 'primitive',
  components: 'component',
  blocks: 'block',
}

export function ItemPage({ tier }: { tier: Tier }) {
  const pageContext = usePageContext()
  const id = (pageContext.routeParams as { id: string }).id
  const key = `${tier}/${id}`
  const Component = itemComponents[key]

  if (!Component) {
    return (
      <>
        <h1 data-aui="page-title">{TIER_LABEL[tier]} not found</h1>
        <p>no {TIER_LABEL[tier]} with id <code>{id}</code>.</p>
      </>
    )
  }

  const parsed = byId[key]
  const meta = parsed ?? { name: id, description: '' }
  const propDefs = parsed?.props ?? []
  const examples = parsed?.examples ?? []
  const compiledBodies = itemExamples[key] ?? {}

  return (
    <>
      <h1 data-aui="page-title">{meta.name}</h1>
      {meta.description && <p data-aui="page-lead">{meta.description}</p>}
      <div data-aui="examples">
        {examples.map((ex, i: number) => (
          <ExampleBlock
            key={i}
            example={ex}
            componentName={meta.name}
            Component={Component}
            compiledBody={compiledBodies[i]}
          />
        ))}
      </div>
      {propDefs.length > 0 && (
        <table data-aui="prop-table">
          <thead>
            <tr><th>prop</th><th>type</th><th>default</th><th>values</th><th>description</th></tr>
          </thead>
          <tbody>
            {propDefs.map((p) => (
              <tr key={p.name}>
                <td>{p.name}</td>
                <td>{p.type}</td>
                <td>{p.default !== undefined ? String(p.default) : '—'}</td>
                <td>{p.values ? p.values.join(' · ') : '—'}</td>
                <td>{p.description ?? ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  )
}
