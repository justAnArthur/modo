import { headingRoles } from '../lib/example-groups'

// Every top-level JSX block in an item's MDX is a live example: it is wrapped
// in <ModoExample code="…" index="…" title="…"> (the runtime's example frame),
// keeping its source for Show code / Copy, and its position in the file and
// the example heading above it, which name it for full screen.
// Loosely typed: only these node fields are touched.
interface Node {
  type: string
  depth?: number
  value?: string
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

function textOf(node: Node): string {
  return node.value ?? node.children?.map(textOf).join('') ?? ''
}

const attribute = (name: string, value: string) => ({ type: 'mdxJsxAttribute', name, value })

// A `#` is a group only if a `##` follows it, which the runtime's heading
// components can't see: the build marks each heading's role instead.
function markHeadings(nodes: Node[]) {
  const headings = nodes.filter(
    (n): n is Node & { depth: 1 | 2 | 3 } => n.type === 'heading' && (n.depth === 1 || n.depth === 2 || n.depth === 3),
  )
  const roles = headingRoles(headings.map(h => h.depth))
  headings.forEach((heading, i) => {
    const { kind, level } = roles[i]!
    heading.data = { ...heading.data, hProperties: { 'data-kind': kind, 'data-level': level } }
  })
}

export function remarkModoExamples() {
  return (tree: Node, file: { value: unknown }) => {
    const source = String(file.value)
    markHeadings(tree.children ?? [])
    let index = 0
    // The example heading over the next block; a group or sub-heading names none.
    let title: string | undefined
    tree.children = tree.children?.map(node => {
      if (node.type === 'heading' && node.data?.hProperties?.['data-kind'] === 'example') title = textOf(node)
      if (node.type !== 'mdxJsxFlowElement' || !node.position) return node
      const code = source.slice(node.position.start.offset, node.position.end.offset)
      const attributes = [attribute('code', code), attribute('index', String(index++))]
      if (title) attributes.push(attribute('title', title))
      title = undefined
      return { type: 'mdxJsxFlowElement', name: 'ModoExample', attributes, children: unwrapParagraphs(node) }
    })
  }
}
