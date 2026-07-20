// shared per-item page. used by /docs/{primitives,components,blocks}/@id.
// the per-tier +Page.tsx is just a tiny wrapper that picks the category
// and lets the dynamic route param drive the key.

import { usePageContext } from 'vike-react/usePageContext'
import { byId, components as itemComponents, examples as itemExamples } from 'virtual:modo-items'
import { ItemExamples } from './item-examples'
import { PropTable } from './prop-table'
import { TIER_LABEL_SINGULAR, type Tier } from '../tiers'

export function ItemPage({ tier }: { tier: Tier }) {
  const pageContext = usePageContext()
  const id = (pageContext.routeParams as { id: string }).id
  const key = `${tier}/${id}`
  const Component = itemComponents[key]

  if (!Component) {
    return (
      <>
        <h1 data-aui="page-title">{TIER_LABEL_SINGULAR[tier]} not found</h1>
        <p>no {TIER_LABEL_SINGULAR[tier]} with id <code>{id}</code>.</p>
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
      <ItemExamples
        examples={examples}
        componentName={meta.name}
        Component={Component}
        compiledBodies={compiledBodies}
      />
      <PropTable props={propDefs} />
    </>
  )
}
