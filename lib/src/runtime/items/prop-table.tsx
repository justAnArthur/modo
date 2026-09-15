import { props as propsMap } from 'virtual:modo-items'

export function PropTable({ itemId }: { itemId: string }) {
  const list = propsMap[itemId] ?? []
  if (!list.length) return <p>No documented props.</p>
  return (
    <table data-modo="prop-table">
      <thead>
        <tr>
          <th>Name</th>
          <th>Type</th>
          <th>Default</th>
          <th>Description</th>
        </tr>
      </thead>
      <tbody>
        {list.map((p) => (
          <tr key={p.name}>
            <td>
              <code>{p.name}</code>
              {p.optional ? <small> (optional)</small> : null}
            </td>
            <td>
              <code>{p.type}</code>
            </td>
            <td>{p.default ? <code>{p.default}</code> : <small>—</small>}</td>
            <td>{p.description ?? ''}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
