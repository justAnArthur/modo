import { shell } from 'virtual:modo-shell'
import { isValidElement, type ReactNode } from 'react'
import { GROUPED_PROP, headingRole } from '../lib/example-groups'
import { Heading, slug } from './anchor'
import { CodeBlock } from './code-block'
import { bindings, ExampleFrame } from './items/examples'
import { contentHref } from './router'

export function textOf(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(textOf).join('')
  if (isValidElement<{ children?: ReactNode }>(node)) return textOf(node.props.children)
  return ''
}

// What a heading is depends on the file (lib/src/lib/example-groups.ts): flat,
// `# Title` names the example below it, like `@example # Title`; grouped (it
// has a `##`), `#` is a group and `##` an example inside it.
function exampleHeading(depth: 1 | 2 | 3) {
  return function ExampleHeading({
    children,
    [GROUPED_PROP]: grouped,
  }: {
    children?: ReactNode
    'data-grouped'?: boolean
  }) {
    const role = headingRole(depth, Boolean(grouped))
    const label = textOf(children)
    if (role.kind === 'sub') {
      return (
        <Heading level={role.level} label={label}>
          {children}
        </Heading>
      )
    }
    return (
      <Heading
        level={role.level}
        label={label}
        id={`example-${slug(label)}`}
        modo={role.kind === 'group' ? 'example-group-title' : 'example-card-title'}
      >
        {children}
      </Heading>
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
  h1: exampleHeading(1),
  h2: exampleHeading(2),
  h3: exampleHeading(3),
  ModoExample: ({ code, children }: { code: string; children: ReactNode }) => (
    <div data-modo="example-card">
      <ExampleFrame code={code}>{children}</ExampleFrame>
    </div>
  ),
}
