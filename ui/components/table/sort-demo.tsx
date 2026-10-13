/*
 * Local addition (not part of Fluid Functionalism): a docs stage for the
 * sortable heads. Examples run no hooks, so the sorting lives here; a real
 * table sorts its data the same way (or hands the direction to TanStack).
 */

import { useState } from 'react'
import Table, { type SortDirection } from './index'

const PEOPLE = [
  { name: 'Alice', role: 'Engineer', joined: 2019 },
  { name: 'Bob', role: 'Designer', joined: 2022 },
  { name: 'Carol', role: 'Manager', joined: 2017 },
  { name: 'Dan', role: 'Researcher', joined: 2021 },
]

type Column = 'name' | 'role' | 'joined'

const COLUMNS: { key: Column; label: string }[] = [
  { key: 'name', label: 'Name' },
  { key: 'role', label: 'Role' },
  { key: 'joined', label: 'Joined' },
]

/** A table whose heads sort its rows: one column at a time, unsorted → ascending → descending → unsorted. */
export default function SortDemo() {
  const [sort, setSort] = useState<{ column: Column; direction: SortDirection }>({ column: 'name', direction: 'asc' })

  const rows = [...PEOPLE]
  if (sort.direction) {
    const sign = sort.direction === 'asc' ? 1 : -1
    rows.sort((a, b) => (a[sort.column] > b[sort.column] ? sign : -sign))
  }

  return (
    <Table>
      <Table.Header>
        <Table.Row>
          {COLUMNS.map(({ key, label }) => (
            <Table.Head
              key={key}
              sortDirection={sort.column === key ? sort.direction : false}
              onSort={direction => setSort({ column: key, direction })}
            >
              {label}
            </Table.Head>
          ))}
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {rows.map((person, i) => (
          <Table.Row key={person.name} index={i}>
            <Table.Cell>{person.name}</Table.Cell>
            <Table.Cell>{person.role}</Table.Cell>
            <Table.Cell>{person.joined}</Table.Cell>
          </Table.Row>
        ))}
      </Table.Body>
    </Table>
  )
}
