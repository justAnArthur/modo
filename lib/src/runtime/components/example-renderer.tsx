// renders a `ParsedExample` from the TSDoc parser. each example is:
//   - title (h3)
//   - description (lightweight markdown: paragraphs, inline *, **, `code`)
//   - code (jsx) — rendered as a live component AND shown as source, with a
//     toggle.
//
// the live render works by wrapping the code in a function that takes the
// actual component as a parameter (so the user can write `<Button>...` and we
// bind `Button` to the parameter via destructuring), compiling it with
// esbuild on the server, dynamic-importing the result, and calling it.

import * as React from 'react'
import { useState } from 'react'
import * as esbuild from 'esbuild'
import type { ParsedExample } from '../../exports/tsdoc'

// ── minimal markdown renderer ───────────────────────────────────────

function renderInline(text: string): React.ReactNode[] {
  // very small: handle **bold**, *italic*, `code`. everything else is plain.
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
    // collect plain text up to the next special char
    let j = i
    while (j < text.length && text[j] !== '`' && text[j] !== '*') j++
    out.push(text.slice(i, j))
    i = j
  }
  return out
}

export function Markdown({ source }: { source: string }): React.ReactNode {
  if (!source) return null
  // split on blank lines into paragraphs; lines starting with # are headings.
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

// ── live code compilation ───────────────────────────────────────────

const cache = new Map<string, (Component: React.ComponentType<any>) => React.ReactNode>()

// synchronous compile. esbuild's `buildSync` is the only way to do
// esbuild bundling without an async step. we then strip the import +
// export statements esbuild emits (we pass `React` in as a parameter
// instead) and invoke the body via `new Function`.
//
// the jsx transform is the classic `React.createElement` one (no
// jsx-runtime imports), so the only external dep is `react`. the
// result is a function `(Component) => ReactNode` that the renderer
// calls synchronously during SSR and on every client render.
function compileExampleSync(
  code: string,
  componentName: string,
): (Component: React.ComponentType<any>) => React.ReactNode {
  const key = `${componentName}:${code}`
  if (cache.has(key)) return cache.get(key)!
  const wrapped = `
import * as React from 'react'
export default function render(Component) {
  const ${componentName} = Component
  return (${code})
}
`
  const result = esbuild.buildSync({
    stdin: { contents: wrapped, loader: 'tsx', resolveDir: process.cwd() },
    bundle: true,
    write: false,
    format: 'esm',
    platform: 'neutral',
    // classic transform: turns <Foo /> into React.createElement(Foo, ...).
    // avoids the jsx-runtime import so the only external is react.
    jsx: 'transform',
    target: 'es2020',
    external: ['react', 'react-dom', 'modo-atomic-ui'],
    logLevel: 'silent',
  })
  const out = result.outputFiles?.[0]?.text ?? ''
  if (!out) throw new Error('esbuild produced no output for example code')
  // strip the import + export statements (which can be multi-line).
  // esbuild emits `import * as React from "react";` and
  // `export { render as default };` (the latter can wrap across lines).
  // we pass React in as a parameter and call the function directly.
  const body = out
    .replace(/^\s*import\s+[\s\S]*?;[\t ]*$/gm, '')           // import lines
    .replace(/export\s*\{[\s\S]*?\}\s*;?/g, '')              // export {} blocks
    .replace(/export\s+default\s+/g, '')                     // `export default `
    .trim()
  // eslint-disable-next-line @typescript-eslint/no-implied-eval, no-new-func
  const fn = new Function('React', 'Component', `${body}\nreturn render(Component);`) as (
    React: any,
    Component: React.ComponentType<any>,
  ) => React.ReactNode
  const wrapped2 = (Component: React.ComponentType<any>) => fn(React, Component)
  cache.set(key, wrapped2)
  return wrapped2
}

// ── public component ────────────────────────────────────────────────

interface ExampleBlockProps {
  example: ParsedExample
  componentName: string
  Component: React.ComponentType<any>
}

export function ExampleBlock({ example, componentName, Component }: ExampleBlockProps) {
  const [showCode, setShowCode] = useState(false)

  // compile synchronously. the function is cached so subsequent renders
  // (and re-renders after client-side hydration) are O(1).
  let rendered: React.ReactNode
  let error: string | null = null
  try {
    const fn = compileExampleSync(example.code, componentName)
    rendered = fn(Component)
  } catch (e) {
    error = (e as Error).message
  }

  return (
    <div data-aui="example-card">
      <div data-aui="example-card-stage">
        {error
          ? <code data-aui="example-error">{error}</code>
          : rendered ?? <span data-aui="example-loading">…</span>}
      </div>
      <div data-aui="example-card-meta">
        <span data-aui="example-card-name">{example.name}</span>
        {example.description && (
          <div data-aui="example-card-description">
            <Markdown source={example.description} />
          </div>
        )}
        <div data-aui="example-card-actions">
          <button
            type="button"
            data-aui="example-toggle"
            aria-expanded={showCode}
            onClick={() => setShowCode((v) => !v)}
          >
            {showCode ? 'hide code' : 'show code'}
          </button>
        </div>
        {showCode && (
          <pre data-aui="example-code"><code>{example.code}</code></pre>
        )}
      </div>
    </div>
  )
}
