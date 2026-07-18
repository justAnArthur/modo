// /docs/blocks/:id — per-block page.
import { tokens, css as tokensCss } from 'virtual:modo-tokens'
import { byId, components as itemComponents } from 'virtual:modo-items'
import { usePageContext } from 'vike-react/usePageContext'
import { ExampleBlock } from '../../../../components/example-renderer'

export default function BlockPage() {
  const pageContext = usePageContext()
  const id = (pageContext.routeParams as { id: string }).id
  const key = `blocks/${id}`
  const Component = itemComponents[key]

  if (!Component) {
    return (
      <>
        <h1 data-aui="page-title">block not found</h1>
        <p>no block with id <code>{id}</code>.</p>
      </>
    )
  }

  const parsed = byId[key]
  const meta = parsed ?? { name: id, description: '' }
  const propDefs = parsed?.props ?? []
  const examples = parsed?.examples ?? []

  return (
    <>
      <style>{tokensCss}</style>
      <h1 data-aui="page-title">{meta.name}</h1>
      {meta.description && <p data-aui="page-lead">{meta.description}</p>}
      <div data-aui="examples">
        {examples.map((ex: any, i: number) => (
          <ExampleBlock key={i} example={ex} componentName={meta.name} Component={Component} />
        ))}
      </div>
      {propDefs.length > 0 && (
        <table data-aui="prop-table">
          <thead>
            <tr><th>prop</th><th>type</th><th>default</th><th>values</th><th>description</th></tr>
          </thead>
          <tbody>
            {propDefs.map((p: any) => (
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
