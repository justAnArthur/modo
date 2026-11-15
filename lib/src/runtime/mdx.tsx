import { shell } from 'virtual:modo-shell'
import { isValidElement, type ReactNode } from 'react'
import { Heading } from './anchor'
import { CodeBlock } from './code-block'
import { bindings, ExampleFrame, ExampleTitle } from './items/examples'
import { contentHref } from './location'

function textOf(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(textOf).join('')
  if (isValidElement<{ children?: ReactNode }>(node)) return textOf(node.props.children)
  return ''
}

// `# Title` names the example below it, like `@example # Title`.
function MdxExampleTitle({ children }: { children?: ReactNode }) {
  return <ExampleTitle label={textOf(children)}>{children}</ExampleTitle>
}

function SubHeading({ children }: { children?: ReactNode }) {
  return (
    <Heading level={4} label={textOf(children)}>
      {children}
    </Heading>
  )
}

// A fence arrives as <pre><code className="language-x">…</code></pre>.
function Pre({ children }: { children?: ReactNode }) {
  if (!isValidElement<{ className?: string; children?: ReactNode }>(children)) return <pre>{children}</pre>
  const { className, children: code } = children.props
  return <CodeBlock code={textOf(code).replace(/\n$/, '')} language={className?.replace(/^language-/, '')} />
}

/**
 * What an item's included .mdx examples render with, inside the Examples section.
 * Items and the `examples` scope resolve as JSX tags without imports, like in
 * inline examples; an identifier used in an expression (`icon={Plus}`) still
 * needs a real import. Each top-level JSX block arrives wrapped in ModoExample
 * (lib/src/plugins/mdx-examples.ts).
 */
export const mdxComponents: Record<string, unknown> = {
  ...bindings,
  a: ({ href = '', children }: { href?: string; children?: ReactNode }) => (
    <shell.Link href={contentHref(href)}>{children}</shell.Link>
  ),
  pre: Pre,
  h1: MdxExampleTitle,
  h2: MdxExampleTitle,
  h3: SubHeading,
  ModoExample: ({ code, children }: { code: string; children: ReactNode }) => (
    <div data-modo="example-card">
      <ExampleFrame code={code}>{children}</ExampleFrame>
    </div>
  ),
}
