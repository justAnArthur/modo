import type { ParsedProp } from '../../exports/tsdoc'

export function PropTable({ props }: { props: ReadonlyArray<ParsedProp> }) {
  if (props.length === 0) return null
  return (
    <table data-aui="prop-table">
      <thead>
        <tr>
          <th>prop</th>
          <th>type</th>
          <th>default</th>
          <th>values</th>
          <th>description</th>
        </tr>
      </thead>
      <tbody>
        {props.map((p) => (
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
  )
}
