/*
 * Local addition (not part of Fluid Functionalism): the docs stage of the
 * Combobox page's remote example. A fake server answers each query after a
 * beat, a page at a time, so the example stays hook-free.
 */

import { useEffect, useState } from 'react'
import Button from '../../button'
import Combobox from './index'

const CITIES = [
  'Amsterdam',
  'Athens',
  'Barcelona',
  'Berlin',
  'Bratislava',
  'Brussels',
  'Bucharest',
  'Budapest',
  'Copenhagen',
  'Dublin',
  'Helsinki',
  'Kyiv',
  'Lisbon',
  'Ljubljana',
  'London',
  'Madrid',
  'Oslo',
  'Paris',
  'Prague',
  'Riga',
  'Rome',
  'Sofia',
  'Stockholm',
  'Tallinn',
  'Vienna',
  'Vilnius',
  'Warsaw',
  'Zagreb',
]

const PAGE = 6

interface RemoteDemoProps {
  /** How long the fake server takes, in ms. Defaults to `600`. */
  latency?: number
}

export default function RemoteDemo({ latency = 600 }: RemoteDemoProps) {
  const [query, setQuery] = useState('')
  const [limit, setLimit] = useState(PAGE)
  const [items, setItems] = useState<string[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    const timer = setTimeout(() => {
      const matches = CITIES.filter(city => city.toLowerCase().includes(query.trim().toLowerCase()))
      setItems(matches.slice(0, limit))
      setTotal(matches.length)
      setLoading(false)
    }, latency)
    return () => clearTimeout(timer)
  }, [query, limit, latency])

  return (
    <div className="w-72 max-w-full">
      <Combobox
        items={items}
        filter={null}
        loading={loading}
        inputValue={query}
        onInputValueChange={next => {
          setQuery(next)
          setLimit(PAGE)
        }}
      >
        <Combobox.Input placeholder="Search a city…" />
        <Combobox.Content
          footer={
            items.length < total ? (
              <Button variant="ghost" size="compact" className="w-full" onClick={() => setLimit(limit + PAGE)}>
                Load more ({total - items.length})
              </Button>
            ) : undefined
          }
        >
          <Combobox.Empty>No city matches.</Combobox.Empty>
          <Combobox.List>
            {item => (
              <Combobox.Item key={String(item)} value={String(item)}>
                {String(item)}
              </Combobox.Item>
            )}
          </Combobox.List>
        </Combobox.Content>
      </Combobox>
    </div>
  )
}
