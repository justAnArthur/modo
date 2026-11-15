import { byId, exampleDocs, examples as examplesMap } from 'virtual:modo-items'
import { shell } from 'virtual:modo-shell'
import { type ReactNode, useEffect } from 'react'
import { compileExampleBody, isCompiledExample } from '../../lib/example'
import type { Tier } from '../../lib/tiers'
import { navigate } from '../router'
import { bindings, ExampleBoundary, exampleKey, useBabel } from './examples'
import { liveBlocks } from './preview'

function findExample(itemId: string, key: string): { title?: string; node: ReactNode } | undefined {
  const inline = (examplesMap[itemId] ?? []).find((ex, i) => exampleKey(ex.title, i) === key)
  if (inline) return { title: inline.title, node: <Inline code={inline.code} /> }
  for (const [doc, Doc] of (exampleDocs[itemId] ?? []).entries()) {
    const block = liveBlocks(Doc).find(b => exampleKey(b.props.title, Number(b.props.index), doc) === key)
    if (block) return { title: block.props.title, node: block }
  }
  return undefined
}

function Inline({ code }: { code: string }) {
  const compiled = useBabel() ? compileExampleBody(code) : null
  return isCompiledExample(compiled) ? compiled(bindings) : null
}

/** The item page with the example's card in view. */
function itemUrl(title: string | undefined): URL {
  const url = new URL(window.location.href)
  url.search = ''
  url.hash = title ? `example-${exampleKey(title, 0)}` : ''
  return url
}

/** One example alone, filling the viewport at 1:1, on its item's route (`?example=<key>`). */
export function ExampleSolo({ tier, id, example }: { tier: Tier; id: string; example: string }) {
  const { Button, Icon } = shell
  const itemId = `${tier}:${id}`
  const found = findExample(itemId, example)
  const name = byId[itemId]?.name ?? id

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
