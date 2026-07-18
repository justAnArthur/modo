// /docs/components/:id — per-component page.
import { tokens, css as tokensCss } from 'virtual:modo-tokens'
import { usePageContext } from 'vike-react/usePageContext'

const items = import.meta.glob<any>('../../../../../../demo/{primitives,components,blocks}/*/index.tsx', { eager: true })

export default function ComponentPage() {
  const pageContext = usePageContext()
  const id = (pageContext.routeParams as { id: string }).id
  const keys = Object.keys(items as Record<string, any>)
  const match = keys.find((k) => k.endsWith(`/components/${id}/index.tsx`))
  const mod = match ? (items as Record<string, any>)[match] : undefined

  if (!mod) {
    return (
      <>
        <h1 data-aui="page-title">component not found</h1>
        <p>no component with id <code>{id}</code>.</p>
      </>
    )
  }

  const { Component, examples, props: propDefs, meta } = mod
  return (
    <>
      <style>{tokensCss}</style>
      <h1 data-aui="page-title">{meta?.name ?? id}</h1>
      {meta?.description && <p data-aui="page-lead">{meta.description}</p>}
      <div data-aui="examples">
        {(examples ?? []).map((ex: any) => (
          <div key={ex.name} data-aui="example-card">
            <div data-aui="example-card-stage">
              <Component {...(ex.props ?? {})}>{ex.children}</Component>
            </div>
            <span data-aui="example-card-name">{ex.name}</span>
          </div>
        ))}
      </div>
      {propDefs && propDefs.length > 0 && (
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
