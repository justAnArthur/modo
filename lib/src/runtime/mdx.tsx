import { shell } from 'virtual:modo-shell'
import { isValidElement, type ReactNode, useContext } from 'react'
import { type HeadingRole, headingRoles } from '../lib/example-groups'
import { exampleKey } from '../lib/paths'
import { Heading } from './anchor'
import { CodeBlock } from './code-block'
import { bindings, ExampleDocContext, ExampleFrame, ExampleTitle } from './items/examples'
import { contentHref } from './location'

export function textOf(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(textOf).join('')
  if (isValidElement<{ children?: ReactNode }>(node)) return textOf(node.props.children)
  return ''
}

interface MdxHeadingProps {
  children?: ReactNode
  'data-kind'?: HeadingRole['kind']
  /** A string by the time it reaches React. */
  'data-level'?: `${HeadingRole['level']}`
}

// `# Title` names the example below it, like `@example # Title`; a `#` over
// `##` examples is their group. The build marks every top-level heading with
// its role (lib/src/plugins/mdx-examples.ts); one nested in JSX takes the
// flat file's role for its depth.
function mdxHeading(depth: 1 | 2 | 3) {
  const [fallback] = headingRoles([depth])
  return function MdxHeading({ children, 'data-kind': kind, 'data-level': level }: MdxHeadingProps) {
    const label = textOf(children)
    const role: HeadingRole = kind ? { kind, level: Number(level) as HeadingRole['level'] } : fallback!
    if (role.kind === 'sub') {
      return (
        <Heading level={role.level} label={label}>
          {children}
        </Heading>
      )
    }
    return (
      <ExampleTitle label={label} level={role.level === 4 ? 4 : 3} group={role.kind === 'group'}>
        {children}
      </ExampleTitle>
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
  h1: mdxHeading(1),
  h2: mdxHeading(2),
  h3: mdxHeading(3),
  ModoExample,
}

/** The props lib/src/plugins/mdx-examples.ts gives a live block. */
export interface ModoExampleProps {
  code: string
  /** The block's position among the file's live blocks, from 0. */
  index: string
  /** The example heading above it. */
  title?: string
  children: ReactNode
}

function ModoExample({ code, index, title, children }: ModoExampleProps) {
  const doc = useContext(ExampleDocContext)
  return (
    <div data-modo="example-card">
      <ExampleFrame code={code} fullScreen={exampleKey(title, Number(index), doc)}>
        {children}
      </ExampleFrame>
    </div>
  )
}
