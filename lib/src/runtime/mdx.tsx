import { isValidElement, type ReactNode } from 'react'
import { byName, exampleScope } from 'virtual:modo-items'
import { shell } from 'virtual:modo-shell'
import { Anchor, slug } from './anchor'
import { CodeBlock } from './code-block'
import { ExampleFrame } from './items/examples'

function textOf(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(textOf).join('')
  if (isValidElement<{ children?: ReactNode }>(node)) return textOf(node.props.children)
  return ''
}

// `# Title` names the example below it, like `@example # Title`.
function ExampleTitle({ children }: { children?: ReactNode }) {
  const label = textOf(children)
  const id = `example-${slug(label)}`
  return (
    <h3 data-modo="example-card-title" id={id}>
      {children}
      <Anchor id={id} label={label} />
    </h3>
  )
}

function SubHeading({ children }: { children?: ReactNode }) {
  const label = textOf(children)
  const id = slug(label)
  return (
    <h4 id={id}>
      {children}
      <Anchor id={id} label={label} />
    </h4>
  )
}

// A fence arrives as <pre><code className="language-x">…</code></pre>.
function Pre({ children }: { children?: ReactNode }) {
  if (!isValidElement<{ className?: string; children?: ReactNode }>(children)) return <pre>{children}</pre>
  const { className, children: code } = children.props
  return <CodeBlock code={textOf(code).replace(/\n$/, '')} language={className?.replace(/^language-/, '')} />
}

/**
 * What an item's examples.mdx renders with, inside the Examples section.
 * Items and the `examples` scope resolve as JSX tags without imports, like in
 * inline examples; an identifier used in an expression (`icon={Plus}`) still
 * needs a real import. Each top-level JSX block arrives wrapped in ModoExample
 * (lib/src/plugins/mdx-examples.ts).
 */
export const mdxComponents: Record<string, unknown> = {
  ...exampleScope,
  ...byName,
  a: ({ href, children }: { href?: string; children?: ReactNode }) => <shell.Link href={href}>{children}</shell.Link>,
  pre: Pre,
  h1: ExampleTitle,
  h2: ExampleTitle,
  h3: SubHeading,
  ModoExample: ({ code, children }: { code: string; children: ReactNode }) => (
    <div data-modo="example-card">
      <ExampleFrame code={code}>{children}</ExampleFrame>
    </div>
  ),
}
