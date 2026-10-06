import { byName, exampleScope } from 'virtual:modo-items'
import { shell } from 'virtual:modo-shell'
import { Component, type ReactNode, useState } from 'react'
import { compileExampleBody, isCompiledExample } from '../../lib/example'
import type { ParsedExample } from '../../lib/tsdoc'
import { Heading, slug } from '../anchor'
import { CopyButton } from '../code-block'
import { Markdown } from '../markdown'

// Identifiers available to every example: the `examples` config module's
// exports, then the items by name (items win on collision). Module-level so
// compiled examples cache their bindings per this one object.
export const bindings: Record<string, unknown> = { ...exampleScope, ...byName }

/** `@example` cards, then the item's included .mdx examples (`children`). */
export function ItemExamples({ examples, children }: { examples: ParsedExample[]; children?: ReactNode }) {
  return (
    <section data-modo="section">
      <Heading level={2} label="Examples" modo="section-title" />
      {examples.map((ex, i) => (
        <ExampleCard key={i} example={ex} />
      ))}
      {children}
    </section>
  )
}

/** Keeps one broken example from taking down the page; the error is logged. */
export class ExampleBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
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

function ExampleCard({ example: { title, description, code } }: { example: ParsedExample }) {
  const compiled = compileExampleBody(code)
  return (
    <div data-modo="example-card">
      {title ? <Heading level={3} label={title} id={`example-${slug(title)}`} modo="example-card-title" /> : null}
      {description ? (
        <div data-modo="prose">
          <Markdown source={description} />
        </div>
      ) : null}
      <ExampleFrame code={code}>{isCompiledExample(compiled) ? compiled(bindings) : null}</ExampleFrame>
    </div>
  )
}

/** The live stage, its hover-revealed Copy / Code corner and the code panel. */
export function ExampleFrame({ code, children }: { code: string; children: ReactNode }) {
  const { Code, Button, Icon } = shell
  const [open, setOpen] = useState(false)
  return (
    <div data-modo="example-card-frame">
      <div data-modo="example-card-stage">
        <ExampleBoundary key={code}>{children}</ExampleBoundary>
      </div>
      <div data-modo="example-actions">
        <CopyButton text={code} />
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Show code"
          aria-pressed={open}
          onClick={() => setOpen(o => !o)}
        >
          <Icon name="code" label="Code" />
        </Button>
      </div>
      {open && (
        <div data-modo="example-code">
          <Code language="tsx">{code}</Code>
        </div>
      )}
    </div>
  )
}
