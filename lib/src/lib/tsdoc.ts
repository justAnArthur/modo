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
  /** `@example {@include ./x.mdx}` paths, relative to the item source. */
  exampleDocs: string[]
  errors: string[]
}

export interface ParseOptions {
  /** Reads a `{@include}` / `{@includeCode}` path (relative to the item source); null when it can't. */
  readFile?: (path: string) => string | null
}

export function parseItemSource(src: string, opts: ParseOptions = {}): ParsedItem {
  // Line comments only where `//` follows start/whitespace/punctuation, so
  // `https://…` inside JSDoc and strings survives.
  const cleaned = src.replace(/(^|[\s;,(){}[\]])\/\/[^\n]*/g, '$1')

  let name = ''
  let jsdocAnchor = 0
  let fnStart = -1
  // Set when the item is `const X = forwardRef<HTML…, XProps>(…)` — the props
  // type is the named second type argument, not a parameter list.
  let forwardRefPropsType: string | null = null

  const fnDeclMatch = cleaned.match(/export\s+default\s+function\s+([A-Za-z_$][\w$]*)?\s*[(<]/)
  if (fnDeclMatch) {
    // Anonymous: the bundler names the item after its directory.
    name = fnDeclMatch[1] ?? ''
    jsdocAnchor = fnDeclMatch.index ?? 0
    fnStart = cleaned.indexOf('function', jsdocAnchor)
  } else {
    const identMatch = cleaned.match(/export\s+default\s+([A-Za-z_$][\w$]*)\s*[;\n]/)
    if (!identMatch) {
      return fail('No `export default` found')
    }
    name = identMatch[1]!
    fnStart = cleaned.search(new RegExp(`function\\s+${name}\\s*[(<]`))
    // The doc block belongs to the component declaration, not to wherever the
    // `export default` statement happens to sit (often the bottom of the file,
    // below sub-components that may carry their own JSDoc).
    const declStart = fnStart !== -1 ? fnStart : cleaned.search(new RegExp(`(?:const|let|var)\\s+${name}\\s*=`))
    jsdocAnchor = declStart !== -1 ? declStart : (identMatch.index ?? 0)
    if (fnStart === -1) {
      forwardRefPropsType =
        cleaned.match(
          new RegExp(`(?:const|let|var)\\s+${name}\\s*=\\s*forwardRef<[^,>]+,\\s*([A-Za-z_$][\\w$]*)>`),
        )?.[1] ?? null
    }
  }

  const jsdoc = extractJsdocAbove(cleaned, jsdocAnchor) ?? ''
  // `@example` counts only at the start of a (`*`-stripped) line, so text like
  // `you@example.com` in a description or example code is left alone.
  const exampleIdx = jsdoc.search(/(?:^|\n)[ \t]*@example\b/)
  const errors: string[] = []
  // Includes expand per section, after the tag split, so an included file
  // can't start a new `@example`.
  const include = (text: string) => expandIncludes(text, opts.readFile, errors)
  const description = include(exampleIdx === -1 ? jsdoc : jsdoc.slice(0, exampleIdx)).trim()
  const examplesRoot = exampleIdx === -1 ? '' : jsdoc.slice(exampleIdx)
  const exampleDocs: string[] = []
  const examples = examplesRoot ? extractExamples(examplesRoot, include, exampleDocs) : []

  const result: ParsedItem = { name, description, props: [], examples, exampleDocs, errors }
  if (fnStart === -1) {
    if (forwardRefPropsType) {
      const props = extractForwardRefProps(cleaned, forwardRefPropsType)
      result.props = props.props
      result.errors.push(...props.errors)
    } else {
      result.errors.push('Could not locate function body')
    }
    return result
  }

  const props = extractProps(cleaned, fnStart)
  result.props = props.props
  result.errors.push(...props.errors)
  return result
}

function fail(msg: string): ParsedItem {
  return { name: '', description: '', props: [], examples: [], exampleDocs: [], errors: [msg] }
}

// The block right above the declaration: only whitespace and modifiers may
// sit between them, or a prop's or sibling's doc would be taken for the item's.
function extractJsdocAbove(src: string, declIndex: number): string | null {
  const last = [...src.slice(0, declIndex).matchAll(/\/\*\*([\s\S]*?)\*\//g)].at(-1)
  if (!last) return null
  const gap = src.slice((last.index ?? 0) + last[0].length, declIndex)
  if (!/^\s*(?:(?:export|default|async|declare)\s+)*$/.test(gap)) return null
  return normalizeJsdoc(last[1] ?? '')
}

function normalizeJsdoc(raw: string): string {
  return raw
    .split('\n')
    .map(line => line.replace(/^\s*\*\s?/, ''))
    .join('\n')
    .trim()
}

interface ExtractPropsResult {
  props: ParsedProp[]
  errors: string[]
}

function extractProps(src: string, fnStart: number): ExtractPropsResult {
  const errors: string[] = []
  const props: ParsedProp[] = []

  const openIdx = src.indexOf('(', fnStart)
  if (openIdx === -1) return { props, errors: ['Could not find parameter list'] }
  const closeIdx = matchClosing(src, openIdx, '(', ')')
  if (closeIdx === undefined) return { props, errors: ['Unbalanced parens in parameter list'] }
  const paramsText = src.slice(openIdx + 1, closeIdx)

  const destructured: Array<{ name: string; default?: string }> = []
  let typeLiteral = ''

  // Destructured only when the parameter itself opens with `{`; in
  // `props: { … }` the brace is the type literal.
  const destrStart = paramsText.trimStart().startsWith('{') ? paramsText.indexOf('{') : -1
  if (destrStart !== -1) {
    const destrEnd = matchClosing(paramsText, destrStart, '{', '}')
    if (destrEnd !== undefined) {
      const inside = paramsText.slice(destrStart + 1, destrEnd)
      for (const part of splitTopLevel(inside, ',')) {
        const trimmed = part.trim()
        if (!trimmed) continue
        const m = trimmed.match(/^(?:\.\.\.)?([A-Za-z_$][\w$]*)\s*(?::\s*([^=]+))?\s*(=\s*([^,]+))?$/)
        if (m) destructured.push({ name: m[1]!, default: m[4]?.trim() })
      }
      const after = paramsText.slice(destrEnd + 1)
      const colonIdx = after.indexOf(':')
      if (colonIdx !== -1) typeLiteral = after.slice(colonIdx + 1).trim()
    }
  } else {
    const colonIdx = paramsText.indexOf(':')
    if (colonIdx !== -1) typeLiteral = paramsText.slice(colonIdx + 1).trim()
  }

  if (!typeLiteral) return { props, errors: ['No type literal found on parameter'] }

  let litText = extractTopObjectLiteral(typeLiteral)
  if (!litText) {
    // A bare identifier (e.g. `props: ButtonProps`) resolves to an interface
    // or object type alias declared in the same file, if any.
    const ident = typeLiteral.match(/^[A-Za-z_$][\w$]*$/)
    if (ident) litText = resolveLocalTypeLiteral(src, ident[0])
  }
  if (!litText) return { props, errors: ['Could not find object type literal'] }

  return { props: finishProps(litText, destructured), errors }
}

function extractForwardRefProps(src: string, typeName: string): ExtractPropsResult {
  const litText = resolveLocalTypeLiteral(src, typeName)
  if (!litText) {
    return { props: [], errors: [`Could not find object type literal for ${typeName}`] }
  }
  return { props: finishProps(litText, []), errors: [] }
}

function finishProps(litText: string, destructured: Array<{ name: string; default?: string }>): ParsedProp[] {
  const props: ParsedProp[] = []
  const litBody = litText.slice(1, -1)
  // Members split at `;` and newlines; a line continuing a member (a union
  // or intersection laid out one member per line) joins the one before it.
  const members: string[] = []
  for (const part of splitTopLevel(litBody, ';\n')) {
    if (!part.trim()) continue
    const prev = members.at(-1)
    if (prev !== undefined && (/^\s*[|&]/.test(part) || /[:|&]\s*$/.test(prev)))
      members[members.length - 1] = `${prev}\n${part}`
    else members.push(part)
  }

  for (const member of members) {
    const memberText = member.trim()
    if (memberText.startsWith('[')) continue
    if (memberText.startsWith('...')) continue
    const cleaned = memberText
      .replace(/^(?:\s*\/\*\*[\s\S]*?\*\/)+/, '')
      .replace(/^readonly\s+/, '')
      .trim()
    const m = cleaned.match(/^([A-Za-z_$][\w$]*)\s*(\?)?:\s*([\s\S]+)$/)
    if (!m) continue
    const name = m[1]!
    const optional = m[2] === '?'
    const type = (m[3] ?? '')
      .trim()
      .replace(/^\|\s*/, '')
      .replace(/\s+/g, ' ')
    props.push({ name, optional, type })
  }

  attachJsdocToProps(litBody, props)

  // The code's own default wins over a documented `@default`.
  for (const p of props) {
    const d = destructured.find(dd => dd.name === p.name)
    if (d?.default) p.default = d.default
  }

  return props
}

// `@default x` fills the Default column; `@values a, b` is dropped when the
// type already lists them (a literal union), else kept as prose.
function attachJsdocToProps(litBody: string, props: ParsedProp[]): void {
  for (const m of litBody.matchAll(/\/\*\*([\s\S]*?)\*\/\s*([A-Za-z_$][\w$]*)\s*\??:/g)) {
    const prop = props.find(p => p.name === m[2])
    if (!prop) continue
    const doc = normalizeJsdoc(m[1] ?? '')
    const def = doc.match(/@default\s+([^\n@]+)/)?.[1]?.trim()
    if (def) prop.default = def
    const literalUnion = /['"`]/.test(prop.type)
    prop.description = doc
      .replace(/@default\s+[^\n@]*/g, '')
      .replace(/@values\s+([^\n@]*)/g, (_, values: string) =>
        literalUnion ? '' : `One of ${values.trim().replace(/[^,\s]+/g, v => `\`${v}\``)}.`,
      )
      .trim()
  }
}

function extractTopObjectLiteral(text: string): string | null {
  let s = text.trim()
  if (s.startsWith('(')) {
    const close = matchClosing(s, 0, '(', ')')
    if (close !== undefined) s = s.slice(1, close)
  }
  const objStart = s.indexOf('{')
  if (objStart === -1) return null
  const objEnd = matchClosing(s, objStart, '{', '}')
  if (objEnd === undefined) return null
  return s.slice(objStart, objEnd + 1)
}

function resolveLocalTypeLiteral(src: string, name: string): string | null {
  for (const re of [
    new RegExp(`interface\\s+${name}\\s*\\{`),
    new RegExp(`interface\\s+${name}\\s+extends\\s+[^{;]+\\{`),
    new RegExp(`type\\s+${name}\\s*=\\s*\\{`),
  ]) {
    const m = src.match(re)
    if (!m) continue
    const open = (m.index ?? 0) + m[0].length - 1
    const close = matchClosing(src, open, '{', '}')
    if (close !== undefined) return src.slice(open, close + 1)
  }
  return null
}

// TypeDoc's inline tags: `{@include ./doc.md}` inlines the file as Markdown,
// `{@includeCode ./x.ts}` as a fenced block (the example's code inside an
// `@example`). Not recursive. An `@example` that is only `{@include ./x.mdx}`
// isn't inlined: the bundle compiles the file into live examples.
const INCLUDE = /\{@include(Code)?\s+([^\s}]+)\s*\}/g
const MDX_INCLUDE = /^\{@include\s+([^\s}]+\.mdx)\s*\}$/

function expandIncludes(text: string, readFile: ParseOptions['readFile'], errors: string[]): string {
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

function matchClosing(src: string, openIdx: number, openCh: string, closeCh: string): number | undefined {
  let depth = 0
  for (let i = openIdx; i < src.length; i++) {
    const ch = src[i]
    if (ch === openCh) depth++
    else if (ch === closeCh) {
      depth--
      if (depth === 0) return i
    }
  }
  return undefined
}

function splitTopLevel(text: string, sep: string): string[] {
  const out: string[] = []
  let depth = 0
  let buf = ''
  let inString: string | null = null
  let inJsdoc = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!
    const prev = text[i - 1]
    if (inJsdoc) {
      buf += ch
      if (ch === '/' && prev === '*') inJsdoc = false
      continue
    }
    if (inString) {
      buf += ch
      if (ch === inString && prev !== '\\') inString = null
      continue
    }
    if (ch === '/' && text[i + 1] === '*' && text[i + 2] === '*') {
      inJsdoc = true
      buf += ch
      continue
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      inString = ch
      buf += ch
      continue
    }
    if (ch === '{' || ch === '(' || ch === '<' || ch === '[') depth++
    else if (ch === '}' || ch === ')' || ch === ']' || (ch === '>' && prev !== '=')) depth--
    if (depth === 0 && sep.includes(ch)) {
      out.push(buf)
      buf = ''
      continue
    }
    buf += ch
  }
  if (buf.trim()) out.push(buf)
  return out
}
