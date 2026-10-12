import { GROUPED_PROP, isGrouped } from '../lib/example-groups'

// Every top-level JSX block in an item's MDX is a live example: it is wrapped
// in <ModoExample code="…"> (the runtime's example frame), keeping its source
// for Show code / Copy. Loosely typed: only these node fields are touched.
interface Node {
  type: string
  depth?: number
  data?: { hProperties?: Record<string, unknown> }
  name?: string | null
  attributes?: unknown[]
  children?: Node[]
  position?: { start: { offset?: number }; end: { offset?: number } }
}

// MDX parses multi-line text inside JSX as Markdown paragraphs; an example is
// TSX, so its text stays inline (a <p> inside a <p> would be invalid DOM).
function unwrapParagraphs(node: Node): Node[] {
  if (!node.children) return [node]
  const children = node.children.flatMap(unwrapParagraphs)
  return node.type === 'paragraph' ? children : [{ ...node, children }]
}

export function remarkModoExamples() {
  return (tree: Node, file: { value: unknown }) => {
    const source = String(file.value)
    // A file with a `##` is grouped (`#` group, `##` example): marked here, at
    // build time, so the runtime never guesses and nothing flashes.
    if (isGrouped(tree.children ?? [])) {
      for (const node of tree.children ?? []) {
        if (node.type === 'heading') node.data = { ...node.data, hProperties: { [GROUPED_PROP]: true } }
      }
    }
    tree.children = tree.children?.map(node => {
      if (node.type !== 'mdxJsxFlowElement' || !node.position) return node
      const code = source.slice(node.position.start.offset, node.position.end.offset)
      return {
        type: 'mdxJsxFlowElement',
        name: 'ModoExample',
        attributes: [{ type: 'mdxJsxAttribute', name: 'code', value: code }],
        children: unwrapParagraphs(node),
      }
    })
  }
}
