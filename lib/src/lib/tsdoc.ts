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
  errors: string[]
}

export function parseItemSource(src: string): ParsedItem {
  const cleaned = src.replace(/\/\/[^\n]*/g, '')

  let name = ''
  let jsdocAnchor = 0
  let fnStart = -1

  const fnDeclMatch = cleaned.match(/export\s+default\s+function\s+([A-Za-z_$][\w$]*)?\s*[(<]/)
  if (fnDeclMatch) {
    name = fnDeclMatch[1] ?? 'Anonymous'
    jsdocAnchor = fnDeclMatch.index ?? 0
    fnStart = cleaned.indexOf('function', jsdocAnchor)
  } else {
    const identMatch = cleaned.match(/export\s+default\s+([A-Za-z_$][\w$]*)\s*[;\n]/)
    if (!identMatch) {
      return fail('No `export default` found')
    }
    name = identMatch[1]!
    jsdocAnchor = identMatch.index ?? 0
    fnStart = cleaned.search(new RegExp(`function\\s+${name}\\s*\\(`))
  }

  if (!name) return fail('Could not determine component name')

  const jsdoc = extractJsdocAbove(cleaned, jsdocAnchor) ?? ''
  const exampleIdx = jsdoc.indexOf('@example')
  const description = exampleIdx === -1 ? jsdoc : jsdoc.slice(0, exampleIdx).trimEnd()
  const examplesRoot = exampleIdx === -1 ? '' : jsdoc.slice(exampleIdx)
  const examples = examplesRoot ? extractExamples(examplesRoot) : []

  const result: ParsedItem = { name, description, props: [], examples, errors: [] }
  if (fnStart === -1) {
    result.errors.push('Could not locate function body')
    return result
  }

  const props = extractProps(cleaned, fnStart)
  result.props = props.props
  result.errors.push(...props.errors)
  return result
}

function fail(msg: string): ParsedItem {
  return { name: '', description: '', props: [], examples: [], errors: [msg] }
}

function extractJsdocAbove(src: string, exportIndex: number): string | null {
  const before = src.slice(0, exportIndex)
  const matches = [...before.matchAll(/\/\*\*([\s\S]*?)\*\//g)]
  if (matches.length === 0) return null
  const last = matches[matches.length - 1]!
  return normalizeJsdoc(last[1] ?? '')
}

function normalizeJsdoc(raw: string): string {
  return raw
    .split('\n')
    .map((line) => line.replace(/^\s*\*\s?/, ''))
    .join('\n')
    .trim()
}

function nameFromParam(raw: string): string | undefined {
  return raw.trim().match(/^(?:\.\.\.)?([A-Za-z_$][\w$]*)/)?.[1]
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

  const destrStart = paramsText.indexOf('{')
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
    if (colonIdx !== -1) {
      typeLiteral = paramsText.slice(colonIdx + 1).trim()
      const name = nameFromParam(paramsText.slice(0, colonIdx))
      if (name) destructured.push({ name })
    }
  }

  if (!typeLiteral) return { props, errors: ['No type literal found on parameter'] }

  const litText = extractTopObjectLiteral(typeLiteral)
  if (!litText) return { props, errors: ['Could not find object type literal'] }

  const litBody = litText.slice(1, -1)
  const members = splitTopLevel(litBody, ';\n').filter((s) => s.trim())

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
    const type = (m[3] ?? '').trim()
    props.push({ name, optional, type })
  }

  attachJsdocToProps(litBody, props)

  for (const p of props) {
    const d = destructured.find((dd) => dd.name === p.name)
    if (d?.default) p.default = d.default
  }

  return { props, errors }
}

function attachJsdocToProps(litBody: string, props: ParsedProp[]): void {
  const re = /\/\*\*([\s\S]*?)\*\/\s*([A-Za-z_$][\w$]*)\s*\??:/g
  let m: RegExpExecArray | null
  while ((m = re.exec(litBody)) !== null) {
    const name = m[2]!
    const desc = normalizeJsdoc(m[1] ?? '')
    const prop = props.find((p) => p.name === name)
    if (prop) prop.description = desc
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

function extractExamples(jsdoc: string): ParsedExample[] {
  const out: ParsedExample[] = []
  const re = /@example\b([\s\S]*?)(?=@example\b|$)/g
  let m: RegExpExecArray | null
  while ((m = re.exec(jsdoc)) !== null) {
    const block = (m[1] ?? '').trim()
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
    const titleLine = lines.find((l) => l.trim().startsWith('# '))
    if (titleLine) {
      title = titleLine.replace(/^#\s+/, '').trim()
      const rest = lines.filter((l) => l !== titleLine).join('\n').trim()
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
