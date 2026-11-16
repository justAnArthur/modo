import { byId, type ItemEntry } from 'virtual:modo-items'
import { shell } from 'virtual:modo-shell'
import { type ReactNode, useEffect } from 'react'
import { exampleKey, itemKey } from '../../lib/paths'
import { slug } from '../../lib/text'
import type { Tier } from '../../lib/tiers'
import { navigate } from '../location'
import { bindings, ExampleBoundary, useExample } from './examples'
import { isLive, mdxBlocks } from './preview'

interface Found {
  title?: string
  node: ReactNode
}

function findExample(entry: ItemEntry, key: string): Found | undefined {
  const inline = entry.examples.findIndex((ex, i) => exampleKey(ex.title, i) === key)
  if (inline >= 0) {
    const { title, code } = entry.examples[inline]!
    return { title, node: <Inline code={code} /> }
  }
  for (const [doc, Doc] of entry.mdxExamples.entries()) {
    const block = mdxBlocks(Doc)
      .filter(isLive)
      .find(b => exampleKey(b.props.title, Number(b.props.index), doc) === key)
    if (block) return { title: block.props.title, node: block }
  }
  return undefined
}

function Inline({ code }: { code: string }) {
  const example = useExample(code)
  return example ? example(bindings) : null
}

/** The item page, scrolled to the example's card when it has a title. */
function itemUrl(title: string | undefined): URL {
  const url = new URL(window.location.href)
  url.search = ''
  url.hash = title ? `example-${slug(title)}` : ''
  return url
}

/** One example alone, across the whole viewport at 1:1, on its item's route (`?example=<key>`). */
export function ExampleSolo({ tier, id, example }: { tier: Tier; id: string; example: string }) {
  const { Button, Icon } = shell
  const entry = byId[itemKey(tier, id)]
  const found = entry && findExample(entry, example)
  const name = entry?.name ?? id

  // Back to the page it was opened from when that's the previous entry, else to the item page.
  const close = () => {
    if ((window.history.state as { modoFrom?: string } | null)?.modoFrom) window.history.back()
    else navigate(itemUrl(found?.title))
  }

  // An example that handles Escape itself (an open dialog) keeps it.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !e.defaultPrevented) close()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  return (
    <main data-modo="example-solo" aria-label={found?.title ? `${found.title} · ${name}` : name}>
      <div data-modo="example-solo-stage">
        {found ? <ExampleBoundary>{found.node}</ExampleBoundary> : <p data-modo="page-lead">Example not found.</p>}
      </div>
      <div data-modo="example-solo-actions">
        <Button variant="ghost" size="icon-sm" aria-label="Close full screen" onClick={close}>
          <Icon name="close" label="Close" />
        </Button>
      </div>
    </main>
  )
}
