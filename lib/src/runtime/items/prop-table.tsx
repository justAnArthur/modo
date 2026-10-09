import { byId } from 'virtual:modo-items'
import { Markdown } from '../markdown'

export function PropTable({ itemId }: { itemId: string }) {
  const list = byId[itemId]?.props ?? []
  if (!list.length) return <p>No documented props.</p>
  return (
    <div data-modo="prop-table-scroll">
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
          {list.map(p => (
            <tr key={p.name}>
              <td>
                <code>{p.name}</code>
                {p.optional ? <small> (optional)</small> : null}
              </td>
              <td>
                <code>{p.type}</code>
              </td>
              <td>{p.default ? <code>{p.default}</code> : <small>—</small>}</td>
              <td>{p.description ? <Markdown source={p.description} inline /> : null}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
