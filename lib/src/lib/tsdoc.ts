export interface ParsedProp {
  name: string
  type: string
  optional: boolean
  default?: string
  description?: string
}

export interface ParsedExample {
  title?: string
  description?: string
  code: string
}

export interface ParsedItem {
  name: string
  description: string
  props: ParsedProp[]
  examples: ParsedExample[]
  /** `@example {@include ./x.mdx}` files, absolute, inherited ones first. */
  exampleDocs: string[]
  /** The files the docs were read from: the default export's declaration, then each `{@inheritDoc}` base. */
  sources: string[]
  errors: string[]
}

export interface DocComment {
  description: string
  examples: ParsedExample[]
  /** `@example {@include ./x.mdx}` paths as written (relative to the comment's file). */
  exampleDocs: string[]
  errors: string[]
}

/** Reads a `{@include}` / `{@includeCode}` path (relative to the comment's file); null when it can't. */
export type ReadInclude = (path: string) => string | null

/** A JSDoc block's text (between `/**` and `*\/`) without the leading `*`s. */
export function normalizeJsdoc(raw: string): string {
  return raw
    .split('\n')
    .map(line => line.replace(/^\s*\*\s?/, ''))
    .join('\n')
    .trim()
}

/** An item's doc block: the description, then the `@example` sections. */
export function parseDocComment(jsdoc: string, readFile?: ReadInclude): DocComment {
  // `@example` counts only at the start of a (`*`-stripped) line, so text like
  // `you@example.com` in a description or example code is left alone.
  const exampleIdx = jsdoc.search(/(?:^|\n)[ \t]*@example\b/)
  const errors: string[] = []
  // Includes expand per section, after the tag split, so an included file
  // can't start a new `@example`.
  const include = (text: string) => expandIncludes(text, readFile, errors)
  const description = include(exampleIdx === -1 ? jsdoc : jsdoc.slice(0, exampleIdx)).trim()
  const examplesRoot = exampleIdx === -1 ? '' : jsdoc.slice(exampleIdx)
  const exampleDocs: string[] = []
  const examples = examplesRoot ? extractExamples(examplesRoot, include, exampleDocs) : []
  return { description, examples, exampleDocs, errors }
}

// `@default x`, else a closing "Defaults to `x`." sentence (kept in the
// prose), fills the Default column; `@values a, b` is dropped when the type
// already lists them (a literal union), else kept as prose.
export function applyPropDoc(prop: ParsedProp, doc: string): void {
  const def =
    doc.match(/@default\s+([^\n@]+)/)?.[1]?.trim() ?? doc.match(/(?:^|[.!?]\s+)Defaults to `([^`]+)`\.(?:\s|$)/)?.[1]
  if (def) prop.default = def
  const literalUnion = /['"`]/.test(prop.type)
  prop.description = doc
    .replace(/@default\s+[^\n@]*/g, '')
    .replace(/@values\s+([^\n@]*)/g, (_, values: string) =>
      literalUnion ? '' : `One of ${values.trim().replace(/[^,\s]+/g, v => `\`${v}\``)}.`,
    )
    .trim()
}

// TypeDoc's inline tags: `{@include ./doc.md}` inlines the file as Markdown,
// `{@includeCode ./x.ts}` as a fenced block (the example's code inside an
// `@example`). Not recursive. An `@example` that is only `{@include ./x.mdx}`
// isn't inlined: the bundle compiles the file into live examples.
const INCLUDE = /\{@include(Code)?\s+([^\s}]+)\s*\}/g
const MDX_INCLUDE = /^\{@include\s+([^\s}]+\.mdx)\s*\}$/

function expandIncludes(text: string, readFile: ReadInclude | undefined, errors: string[]): string {
  return text.replace(INCLUDE, (tag, code: string | undefined, path: string) => {
    const content = readFile?.(path)
    if (content == null) {
      errors.push(`${tag}: file not found`)
      return ''
    }
    if (!code) return content.trim()
    return `\`\`\`${path.match(/\.(\w+)$/)?.[1] ?? ''}\n${content.trim()}\n\`\`\``
  })
}

function extractExamples(jsdoc: string, include: (text: string) => string, docs: string[]): ParsedExample[] {
  const out: ParsedExample[] = []
  for (const m of jsdoc.matchAll(/(?:^|\n)[ \t]*@example\b([\s\S]*?)(?=\n[ \t]*@example\b|$)/g)) {
    const raw = (m[1] ?? '').trim()
    const doc = raw.match(MDX_INCLUDE)?.[1]
    if (doc) {
      docs.push(doc)
      continue
    }

    const block = include(raw)
    if (!block) continue
    const parsed = parseExampleBlock(block)
    if (parsed) out.push(parsed)
  }
  return out
}

function parseExampleBlock(block: string): ParsedExample | null {
  const fence = block.match(/```(?:tsx|jsx|ts|js)?\s*\n([\s\S]*?)```/)
  if (!fence) return null
  const code = (fence[1] ?? '').trim()
  const head = block.slice(0, fence.index).trim()
  let title: string | undefined
  let description: string | undefined
  if (head) {
    const lines = head.split('\n')
    const titleLine = lines.find(l => l.trim().startsWith('# '))
    if (titleLine) {
      title = titleLine.replace(/^#\s+/, '').trim()
      const rest = lines
        .filter(l => l !== titleLine)
        .join('\n')
        .trim()
      if (rest) description = rest
    } else {
      description = head
    }
  }
  return { title, description, code }
}
