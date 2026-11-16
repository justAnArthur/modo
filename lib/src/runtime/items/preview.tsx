import type { ItemEntry } from 'virtual:modo-items'
import { Children, isValidElement, type ReactElement, type ReactNode } from 'react'
import type { ParsedExample } from '../../lib/tsdoc'
import { type ModoExampleProps, mdxComponents } from '../mdx'
import { bindings, ExampleBoundary, useExample } from './examples'

/**
 * The item's first example (its first `@example`, else the first live block of
 * its examples.mdx) rendered bare: the code the item page runs, so an overview
 * shows the real component. An examples.mdx with only fenced code shows its
 * first block.
 */
export function ExamplePreview({ entry }: { entry: ItemEntry }): ReactElement {
  const inline = entry.examples[0]
  if (inline) return <InlinePreview example={inline} />
  const live = firstLiveBlock(entry)
  if (!live) return <span data-modo="bento-empty">No example yet</span>
  return <ExampleBoundary>{live}</ExampleBoundary>
}

function InlinePreview({ example }: { example: ParsedExample }): ReactElement | null {
  const compiled = useExample(example.code)
  if (compiled === undefined) return null
  if (compiled === null) return <span data-modo="bento-empty">Example did not compile</span>
  return <ExampleBoundary>{compiled(bindings)}</ExampleBoundary>
}

/** Whether the item has an example ExamplePreview can render. */
export function hasPreview(entry: ItemEntry): boolean {
  return entry.examples.length > 0 || firstLiveBlock(entry) !== undefined
}

function firstLiveBlock(entry: ItemEntry): ReactNode {
  const Doc = entry.mdxExamples[0]
  if (!Doc) return undefined
  const blocks = mdxBlocks(Doc)
  return blocks.find(isLive) ?? blocks.find(c => isValidElement(c) && c.type === mdxComponents.pre)
}

/**
 * An .mdx file's top-level blocks, each live one a bare `Live` element.
 * Compiled without a provider, MDX content is hook-free: calling it yields the
 * document's top-level blocks, and every live one is a ModoExample. Called
 * during render, outside any boundary: a broken doc has no blocks.
 */
export function mdxBlocks(Doc: ItemEntry['mdxExamples'][number]): ReactNode[] {
  try {
    const content = (Doc as (props: { components: Record<string, unknown> }) => ReactElement<{ children?: ReactNode }>)(
      { components: { ...mdxComponents, ModoExample: Live } },
    )
    return Children.toArray(content.props.children)
  } catch {
    return []
  }
}

export function isLive(node: ReactNode): node is ReactElement<ModoExampleProps> {
  return isValidElement(node) && node.type === Live
}

function Live({ children }: ModoExampleProps) {
  return <>{children}</>
}
