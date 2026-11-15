// Every top-level JSX block in an item's MDX is a live example: it is wrapped
// in <ModoExample code="…" index="…" title="…"> (the runtime's example frame),
// keeping its source for Show code / Copy, its position in the file and the
// `#`/`##` heading above it, which together name it for full screen.
// Loosely typed: only these node fields are touched.
interface Node {
  type: string
  name?: string | null
  depth?: number
  value?: string
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

function textOf(node: Node): string {
  return node.value ?? node.children?.map(textOf).join('') ?? ''
}

const attribute = (name: string, value: string) => ({ type: 'mdxJsxAttribute', name, value })

export function remarkModoExamples() {
  return (tree: Node, file: { value: unknown }) => {
    const source = String(file.value)
    let index = 0
    let title: string | undefined
    tree.children = tree.children?.map(node => {
      if (node.type === 'heading' && (node.depth ?? 0) <= 2) title = textOf(node)
      if (node.type !== 'mdxJsxFlowElement' || !node.position) return node
      const code = source.slice(node.position.start.offset, node.position.end.offset)
      const attributes = [attribute('code', code), attribute('index', String(index++))]
      if (title) attributes.push(attribute('title', title))
      title = undefined
      return { type: 'mdxJsxFlowElement', name: 'ModoExample', attributes, children: unwrapParagraphs(node) }
    })
  }
}
