// Every top-level JSX block in an item's MDX is a live example: it is wrapped
// in <ModoExample code="…"> (the runtime's example frame), keeping its source
// for Show code / Copy. Loosely typed: only these node fields are touched.
interface Node {
  type: string
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
    tree.children = tree.children?.map((node) => {
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
