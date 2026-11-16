/*
 * Local addition (not part of Fluid Functionalism): the docs stage of the
 * Table page's sorting example. A Table that orders its rows by the sort it
 * reports, so the example stays hook-free.
 */

'use client'

import { useState } from 'react'
import type { TableSort } from './context'
import Table from './index'

const PEOPLE = [
  { name: 'Alice', role: 'Engineer', joined: 2019 },
  { name: 'Bob', role: 'Designer', joined: 2022 },
  { name: 'Carol', role: 'Manager', joined: 2017 },
  { name: 'Dan', role: 'Researcher', joined: 2021 },
]

type Person = (typeof PEOPLE)[number]

function sorted(sort: TableSort | null) {
  if (!sort) return PEOPLE
  const key = sort.value as keyof Person
  const sign = sort.direction === 'asc' ? 1 : -1
  return [...PEOPLE].sort((a, b) => (a[key] > b[key] ? sign : a[key] < b[key] ? -sign : 0))
}

export default function SortDemo() {
  const [sort, setSort] = useState<TableSort | null>({ value: 'name', direction: 'asc' })

  return (
    <Table sort={sort} onSortChange={setSort}>
      <Table.Header>
        <Table.Row>
          <Table.Head value="name">Name</Table.Head>
          <Table.Head value="role">Role</Table.Head>
          <Table.Head value="joined">Joined</Table.Head>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {sorted(sort).map(person => (
          <Table.Row key={person.name}>
            <Table.Cell>{person.name}</Table.Cell>
            <Table.Cell>{person.role}</Table.Cell>
            <Table.Cell>{person.joined}</Table.Cell>
          </Table.Row>
        ))}
      </Table.Body>
    </Table>
  )
}
