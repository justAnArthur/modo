import { Component, useState, type ReactNode } from 'react'
import { shell } from 'virtual:modo-shell'
import { byName, exampleScope } from 'virtual:modo-items'
import { compileExampleBody, isCompiledExample } from '../../lib/example'
import type { ParsedExample } from '../../lib/tsdoc'

// Identifiers available to every example: the `examples` config module's
// exports, then the items by name (items win on collision). Module-level so
// compiled examples cache their bindings per this one object.
const bindings: Record<string, unknown> = { ...exampleScope, ...byName }

export function ItemExamples({
  examples,
  componentName,
}: {
  examples: ParsedExample[]
  componentName: string
}) {
  return (
    <section data-modo="section">
      <h2 data-modo="section-title">Examples</h2>
      {examples.length === 0 ? (
        <p>No examples documented.</p>
      ) : (
        examples.map((ex, i) => <ExampleCard key={i} example={ex} />)
      )}
    </section>
  )
}

/** Keeps one broken example from taking down the page; the error is logged. */
class ExampleBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch(error: unknown) {
    console.error('[modo] example failed to render:', error)
  }
  render() {
    return this.state.failed ? null : this.props.children
  }
}

function ExampleCard({ example }: { example: ParsedExample }) {
  const { Code, Button } = shell
  const [open, setOpen] = useState(false)
  const compiled = compileExampleBody(example.code)
  const rendered = isCompiledExample(compiled) ? compiled(bindings) : null
  return (
    <div data-modo="example-card">
      <div data-modo="example-card-meta">
        {example.title ? <strong>{example.title}</strong> : <em>Example</em>}
      </div>
      {example.description ? <p>{example.description}</p> : null}
      <div data-modo="example-card-stage">
        <ExampleBoundary key={example.code}>{rendered}</ExampleBoundary>
      </div>
      <Button variant="ghost" size="sm" onClick={() => setOpen((o) => !o)}>
        {open ? 'Hide source' : 'Show source'}
      </Button>
      {open && (
        <div data-modo="example-code">
          <Code language="tsx">{example.code}</Code>
        </div>
      )}
    </div>
  )
}
