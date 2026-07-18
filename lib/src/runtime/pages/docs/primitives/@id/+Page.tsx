// /docs/primitives/:id — per-primitive page.
import { tokens, css as tokensCss } from 'virtual:modo-tokens'
import { byId } from 'virtual:modo-items'
import { usePageContext } from 'vike-react/usePageContext'
import { ExampleBlock } from '../../../../components/example-renderer'

const items = import.meta.glob<any>('../../../../../../../demo/{primitives,components,blocks}/*/index.tsx', { eager: true })

export default function PrimitivePage() {
  const pageContext = usePageContext()
  const id = (pageContext.routeParams as { id: string }).id
  const keys = Object.keys(items as Record<string, any>)
  const match = keys.find((k) => k.endsWith(`/primitives/${id}/index.tsx`))
  const mod = match ? (items as Record<string, any>)[match] : undefined

  if (!mod) {
    return (
      <>
        <h1 data-aui="page-title">primitive not found</h1>
        <p>no primitive with id <code>{id}</code>.</p>
      </>
    )
  }

  const Component = mod.Component ?? mod.default
  const parsed = byId[`primitives/${id}`]
  const meta = parsed ?? mod.meta ?? { name: id, description: '' }
  const propDefs = parsed?.props ?? mod.props ?? []
  const examples = parsed?.examples ?? mod.examples ?? []

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
