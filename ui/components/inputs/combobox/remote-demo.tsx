/*
 * Local addition (not part of Fluid Functionalism): the docs stage of the
 * Combobox page's remote example. A fake server answers each query after a
 * moment, so the example stays hook-free.
 */

'use client'

import { useEffect, useState } from 'react'
import Button from '../../button'
import Combobox from './index'

const PEOPLE = [
  'Ada Lovelace',
  'Alan Turing',
  'Barbara Liskov',
  'Claude Shannon',
  'Donald Knuth',
  'Edsger Dijkstra',
  'Frances Allen',
  'Grace Hopper',
  'John McCarthy',
  'Ken Thompson',
  'Leslie Lamport',
  'Margaret Hamilton',
  'Niklaus Wirth',
  'Radia Perlman',
  'Tim Berners-Lee',
]

const PAGE = 5

interface RemoteDemoProps {
  /** How long the fake server takes to answer, in ms. */
  latency?: number
}

export default function RemoteDemo({ latency = 600 }: RemoteDemoProps) {
  const [query, setQuery] = useState('')
  const [limit, setLimit] = useState(PAGE)
  const [items, setItems] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    const timer = setTimeout(() => {
      const q = query.trim().toLocaleLowerCase()
      setItems(PEOPLE.filter(name => name.toLocaleLowerCase().includes(q)).slice(0, limit))
      setLoading(false)
    }, latency)
    return () => clearTimeout(timer)
  }, [query, limit, latency])

  const more = !loading && items.length === limit

  return (
    <Combobox
      items={items}
      filter={null}
      loading={loading}
      loadingLabel="Searching…"
      query={query}
      onQueryChange={next => {
        setQuery(next)
        setLimit(PAGE)
      }}
    >
      <Combobox.Input placeholder="Search people…" className="w-[280px]" />
      <Combobox.Content
        footer={
          more && (
            <Button variant="tertiary" size="compact" className="w-full" onClick={() => setLimit(limit + PAGE)}>
              Load more
            </Button>
          )
        }
      >
        <Combobox.Empty>Nobody by that name.</Combobox.Empty>
        <Combobox.List>
          {item => (
            <Combobox.Item key={item as string} value={item as string}>
              {item as string}
            </Combobox.Item>
          )}
        </Combobox.List>
      </Combobox.Content>
    </Combobox>
  )
}
