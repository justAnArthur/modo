import { exampleDocs, examples as examplesMap } from 'virtual:modo-items'
import { Children, isValidElement, type ReactElement, type ReactNode } from 'react'
import { compileExampleBody, isCompiledExample } from '../../lib/example'
import { mdxComponents } from '../mdx'
import { bindings, ExampleBoundary } from './examples'

/** The item's first example — its first `@example`, else the first live block
    of its examples.mdx — rendered bare. The same code the item page runs, so an
    overview shows the real component, not a screenshot. */
export function ExamplePreview({ itemId }: { itemId: string }): ReactElement {
  const inline = examplesMap[itemId]?.[0]
  if (inline) {
    const compiled = compileExampleBody(inline.code)
    if (!isCompiledExample(compiled)) return <span data-modo="bento-empty">Example did not compile</span>
    return <ExampleBoundary>{compiled(bindings)}</ExampleBoundary>
  }
  const live = firstLiveBlock(itemId)
  if (!live) return <span data-modo="bento-empty">No example yet</span>
  return <ExampleBoundary>{live}</ExampleBoundary>
}

/** Whether the item has an example ExamplePreview can render. */
export function hasPreview(itemId: string): boolean {
  return (examplesMap[itemId]?.length ?? 0) > 0 || firstLiveBlock(itemId) !== undefined
}

function firstLiveBlock(itemId: string): ReactNode {
  const Doc = exampleDocs[itemId]?.[0]
  if (!Doc) return undefined
  // Compiled without a provider, MDX content is hook-free: calling it yields
  // the document's top-level blocks, and every live one is a ModoExample.
  const content = (Doc as (props: { components: Record<string, unknown> }) => ReactElement<{ children?: ReactNode }>)({
    components: { ...mdxComponents, ModoExample: Live },
  })
  return Children.toArray(content.props.children).find(c => isValidElement(c) && c.type === Live)
}

function Live({ children }: { children: ReactNode }) {
  return <>{children}</>
}
