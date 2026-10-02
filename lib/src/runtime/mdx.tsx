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

function heading(Tag: 'h2' | 'h3' | 'h4') {
  return function Heading({ children }: { children?: ReactNode }) {
    const label = textOf(children)
    const id = slug(label)
    return (
      <Tag id={id}>
        {children}
        <Anchor id={id} label={label} />
      </Tag>
    )
  }
}

// A fence arrives as <pre><code className="language-x">…</code></pre>.
function Pre({ children }: { children?: ReactNode }) {
  if (!isValidElement<{ className?: string; children?: ReactNode }>(children)) return <pre>{children}</pre>
  const { className, children: code } = children.props
  return <CodeBlock code={textOf(code).replace(/\n$/, '')} language={className?.replace(/^language-/, '')} />
}

/**
 * What an item's MDX renders with. Items and the `examples` scope resolve as
 * JSX tags without imports, like in inline examples; an identifier used in an
 * expression (`icon={Plus}`) still needs a real import. Each top-level JSX
 * block arrives wrapped in ModoExample (lib/src/plugins/mdx-examples.ts).
 */
export const mdxComponents: Record<string, unknown> = {
  ...exampleScope,
  ...byName,
  a: ({ href, children }: { href?: string; children?: ReactNode }) => <shell.Link href={href}>{children}</shell.Link>,
  pre: Pre,
  h1: heading('h2'),
  h2: heading('h2'),
  h3: heading('h3'),
  h4: heading('h4'),
  ModoExample: ({ code, children }: { code: string; children: ReactNode }) => (
    <div data-modo="example-card">
      <ExampleFrame code={code}>{children}</ExampleFrame>
    </div>
  ),
}
