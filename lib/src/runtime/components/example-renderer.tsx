// renders a `ParsedExample` from the TSDoc parser. each example is:
//   - title (h3)
//   - description (lightweight markdown: paragraphs, inline *, **, `code`)
//   - code (jsx) — shown as source with a toggle
//   - compiledBody (string) — the JS-compiled function body produced
//     by the server-side `example-compiler`. this file does NOT
//     import esbuild; the lib keeps esbuild out of the client bundle
//     by pre-compiling examples at build / dev-server time and
//     shipping the body strings through `virtual:modo-items.examples`.
//
// the body is wrapped in `new Function('React', 'Component', body +
// 'return render(Component);')` so the function is constructed lazily
// on the client without esbuild. the cache is module-scoped so the
// function is created once per compiled body across all renders.

import * as React from 'react'
import { useState } from 'react'
import type { ParsedExample } from '../../lib/tsdoc.parser'

// HMR: when an item file changes, the source plugin re-runs and
// re-publishes the virtual:modo-items module. we don't need to clear
// the function cache ourselves — the re-render of ExampleBlock will
// receive a new compiledBody string and construct a new function.
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    fnCache.clear()
  })
}

const fnCache = new Map<string, (React: any, Component: React.ComponentType<any>) => React.ReactNode>()

// noop fallback for when the lib can't resolve a component (e.g. the
// user's items are partially present, or a single item fails to bundle).
// rendering a noop keeps the layout stable and the description + code
// toggle still useful.
const NoopComponent: React.ComponentType<any> = () => null

function buildRenderer(body: string) {
  // the body is just the function contents (after esbuild stripped the
  // import/export wrappers). we wrap it as `return render(...);` so the
  // result of the function body becomes the function's return value.
  // eslint-disable-next-line @typescript-eslint/no-implied-eval, no-new-func
  const fn = new Function('React', 'Component', `${body}\nreturn render(Component);`) as (
    React: typeof import('react'),
    Component: React.ComponentType<any>,
  ) => React.ReactNode
  return fn
}

// ── minimal markdown renderer ───────────────────────────────────────

function renderInline(text: string): React.ReactNode[] {
  const out: React.ReactNode[] = []
  let i = 0
  let key = 0
  while (i < text.length) {
    if (text[i] === '`') {
      const end = text.indexOf('`', i + 1)
      if (end > 0) {
        out.push(<code key={key++} className="modo-inline-code">{text.slice(i + 1, end)}</code>)
        i = end + 1
        continue
      }
    }
    if (text[i] === '*' && text[i + 1] === '*') {
      const end = text.indexOf('**', i + 2)
      if (end > 0) {
        out.push(<strong key={key++}>{text.slice(i + 2, end)}</strong>)
        i = end + 2
        continue
      }
    }
    if (text[i] === '*') {
      const end = text.indexOf('*', i + 1)
      if (end > 0) {
        out.push(<em key={key++}>{text.slice(i + 1, end)}</em>)
        i = end + 1
        continue
      }
    }
    let j = i
    while (j < text.length && text[j] !== '`' && text[j] !== '*') j++
    out.push(text.slice(i, j))
    i = j
  }
  return out
}

export function Markdown({ source }: { source: string }): React.ReactNode {
  if (!source) return null
  const blocks = source.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean)
  return (
    <>
      {blocks.map((b, i) => {
        if (b.startsWith('### ')) return <h3 key={i} data-aui="md-h3">{renderInline(b.slice(4))}</h3>
        if (b.startsWith('## ')) return <h2 key={i} data-aui="md-h2">{renderInline(b.slice(3))}</h2>
        if (b.startsWith('# ')) return <h1 key={i} data-aui="md-h1">{renderInline(b.slice(2))}</h1>
        if (b.startsWith('- ')) {
          const items = b.split('\n').map((l) => l.replace(/^-\s+/, ''))
          return <ul key={i} data-aui="md-ul">{items.map((it, j) => <li key={j}>{renderInline(it)}</li>)}</ul>
        }
        return <p key={i} data-aui="md-p">{renderInline(b)}</p>
      })}
    </>
  )
}

// ── public component ────────────────────────────────────────────────

interface ExampleBlockProps {
  example: ParsedExample
  componentName: string
  Component?: React.ComponentType<any> | null
  /**
   * the pre-compiled function body. produced by `example-compiler`
   * (server-only) and shipped to the client through the source
   * plugin's virtual module export. if missing, we render a
   * placeholder (the example can't run without a compiled body).
   */
  compiledBody?: string
}

export function ExampleBlock({ example, componentName, Component, compiledBody }: ExampleBlockProps) {
  const [showCode, setShowCode] = useState(false)

  let rendered: React.ReactNode
  let error: string | null = null
  const Resolved = Component ?? NoopComponent
  if (compiledBody) {
    try {
      let fn = fnCache.get(compiledBody)
      if (!fn) {
        fn = buildRenderer(compiledBody)
        fnCache.set(compiledBody, fn)
      }
      rendered = fn(React, Resolved)
    } catch (e) {
      error = (e as Error).message
    }
  } else {
    error = 'example not pre-compiled (server-side compilation missing)'
  }

  return (
    <div data-aui="example-card">
      <div data-aui="example-card-stage">
        {error
          ? <code data-aui="example-error">{error}</code>
          : rendered ?? <span data-aui="example-loading">…</span>}
      </div>
      <button
        type="button"
        data-aui="example-toggle"
        aria-expanded={showCode}
        onClick={() => setShowCode((v) => !v)}
      >
        {showCode ? 'hide code' : 'show code'}
      </button>
      <div data-aui="example-card-meta">
        <span data-aui="example-card-name">{example.name}</span>
        {example.description && (
          <div data-aui="example-card-description">
            <Markdown source={example.description} />
          </div>
        )}
        {showCode && (
          <pre data-aui="example-code"><code>{example.code}</code></pre>
        )}
      </div>
    </div>
  )
}
