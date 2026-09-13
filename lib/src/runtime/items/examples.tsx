import { useState } from 'react'
import type { ComponentType } from 'react'
import { shell } from 'virtual:modo-shell'
import { byName } from 'virtual:modo-items'
import { compileExampleBody, isCompiledExample } from '../../lib/example'
import type { ParsedExample } from '../../lib/tsdoc'

export function ItemExamples({
  examples,
  componentName,
}: {
  examples: ParsedExample[]
  componentName: string
}) {
  return (
    <section data-aui="section">
      <h2 data-aui="section-title">Examples</h2>
      {examples.length === 0 ? (
        <p>No examples documented.</p>
      ) : (
        examples.map((ex, i) => <ExampleCard key={i} example={ex} />)
      )}
    </section>
  )
}

function ExampleCard({ example }: { example: ParsedExample }) {
  const { Code, Button } = shell
  const [open, setOpen] = useState(false)
  const compiled = compileExampleBody(example.code)
  const rendered = isCompiledExample(compiled) ? compiled(byName) : null
  return (
    <div data-aui="example-card">
      <div data-aui="example-card-meta">
        {example.title ? <strong>{example.title}</strong> : <em>Example</em>}
      </div>
      {example.description ? <p>{example.description}</p> : null}
      <div data-aui="example-card-stage">{rendered}</div>
      <Button variant="ghost" size="sm" onClick={() => setOpen((o) => !o)}>
        {open ? 'Hide source' : 'Show source'}
      </Button>
      {open && (
        <div data-aui="example-code">
          <Code language="tsx">{example.code}</Code>
        </div>
      )}
    </div>
  )
}
