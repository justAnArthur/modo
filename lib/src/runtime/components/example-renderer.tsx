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
import { useEffect, useState } from 'react'
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

async function compileExample(
  code: string,
  componentName: string,
  factoryPath: string,
): Promise<(Component: React.ComponentType<any>) => React.ReactNode> {
  const key = `${factoryPath}:${componentName}:${code}`
  if (cache.has(key)) return cache.get(key)!
  // wrap the code in a function. the user's code references the component
  // by its real name; we destructure the parameter into that name so the
  // user's JSX works as-is.
  const wrapped = `
import * as React from 'react'
export default function render(Component) {
  const ${componentName} = Component
  return (${code})
}
`
  const result = await esbuild.build({
    stdin: { contents: wrapped, loader: 'tsx', resolveDir: process.cwd() },
    bundle: true,
    write: false,
    format: 'esm',
    platform: 'browser',
    jsx: 'automatic',
    target: 'es2020',
    external: ['react', 'react-dom', 'react/jsx-runtime', 'modo-atomic-ui'],
    logLevel: 'silent',
  })
  const out = result.outputFiles?.[0]?.text
  if (!out) throw new Error('esbuild produced no output for example code')
  // write to a temp .mjs and dynamic-import it.
  const tmp = `${factoryPath.replace(/[^\w]/g, '_')}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.mjs`
  const fs = await import('node:fs/promises')
  await fs.writeFile(tmp, out)
  try {
    const mod = await import(tmp)
    const fn = (mod as { default: (c: React.ComponentType<any>) => React.ReactNode }).default
    cache.set(key, fn)
    return fn
  } finally {
    // best-effort cleanup
    setTimeout(() => { fs.unlink(tmp).catch(() => {}) }, 5000)
  }
}

// ── public component ────────────────────────────────────────────────

interface ExampleBlockProps {
  example: ParsedExample
  componentName: string
  Component: React.ComponentType<any>
}

export function ExampleBlock({ example, componentName, Component }: ExampleBlockProps) {
  const [rendered, setRendered] = useState<React.ReactNode>(null)
  const [error, setError] = useState<string | null>(null)
  const [showCode, setShowCode] = useState(false)
  const factoryPath = typeof window !== 'undefined' ? window.location.pathname : 'ssr'

  useEffect(() => {
    let cancelled = false
    compileExample(example.code, componentName, factoryPath)
      .then((fn) => {
        if (!cancelled) setRendered(fn(Component))
      })
      .catch((e) => {
        if (!cancelled) setError((e as Error).message)
      })
    return () => { cancelled = true }
  }, [example.code, componentName, factoryPath, Component])

  return (
    <div data-aui="example-card">
      <div data-aui="example-card-stage">
        {rendered ?? (error ? <code data-aui="example-error">{error}</code> : <span data-aui="example-loading">…</span>)}
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
