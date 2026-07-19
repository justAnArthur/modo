// parses the default export of a `.tsx` item file (primitive/component/block)
// to extract its meta + examples + props. the user writes:
//
//   /**
//    * Triggers an action or event.
//    *
//    * @example
//    * # Primary
//    *
//    * ```tsx
//    * <Button variant="primary">Save</Button>
//    * ```
//    */
//   export default function Button({ variant = 'primary' }: {
//     /** Visual style. @values primary, secondary, ghost */
//     variant?: 'primary' | 'secondary' | 'ghost'
//   }) { ... }
//
// the parser reads:
//   - description: the leading paragraph of the function's JSDoc
//   - examples: each `@example` block, with optional title and code fences
//   - props: from the function's first-param type literal, with per-prop JSDoc
//     for description, `@values` (custom tag for enum values), and `@default`
//     (used when no destructured default is present)

import * as ts from 'typescript'
import { resolve } from 'node:path'

export interface ParsedProp {
  name: string
  type: 'enum' | 'boolean' | 'string' | 'number' | 'react-node'
  values?: string[]
  default?: string | number | boolean
  description?: string
  required?: boolean
}

export interface ParsedExample {
  name: string
  description?: string
  code: string
  language: string
}

export interface ParsedItem {
  name: string
  description: string
  props: ParsedProp[]
  examples: ParsedExample[]
  errors: string[]
}

// ── JSDoc parsing ──────────────────────────────────────────────────────

// a minimal JSDoc tag parser. tags are `@name [body]` (until next @tag or end).
// body can be free-form, including markdown. `@example` is special: it can
// have a leading title (first line) and any number of code fences.
function parseJSDoc(raw: string): { description: string; tags: Record<string, string[]> } {
  const description: string[] = []
  const tags: Record<string, string[]> = {}
  // strip leading `/**` and trailing `*/` and the `*` per line
  const body = raw
    .replace(/^\s*\/\*\*?/, '')
    .replace(/\*\/\s*$/, '')
    .split('\n')
    .map((l) => l.replace(/^\s*\*\s?/, ''))
    .join('\n')
    .trim()

  let currentTag: string | null = null
  let buf: string[] = []

  const flush = () => {
    if (currentTag === null) {
      description.push(buf.join('\n').trim())
    } else {
      const body = buf.join('\n').trim()
      const list = tags[currentTag!] ?? (tags[currentTag!] = [])
      list.push(body)
    }
    buf = []
  }

  for (const line of body.split('\n')) {
    const m = line.match(/^@(\w+)\s*(.*)$/)
    if (m) {
      flush()
      currentTag = m[1]!
      if (m[2] !== undefined && m[2] !== '') buf.push(m[2])
    } else {
      buf.push(line)
    }
  }
  flush()
  return { description: description.join('\n').trim(), tags }
}

// extract a `@tag body` from a per-property JSDoc comment string (single tag).
// returns undefined if the tag isn't present.
function propTag(jsdocRaw: string, tag: string): string | undefined {
  const { tags } = parseJSDoc(jsdocRaw)
  return tags[tag]?.[0]
}

// extract the description (everything before any @tag) from a JSDoc.
function propDescription(jsdocRaw: string): string {
  const { description } = parseJSDoc(jsdocRaw)
  return description
}

// parse one @example block. shape:
//   @example
//   # Title (optional)
//   <description markdown>
//   ```tsx
//   <code>
//   ```
//   ```tsx
//   <more code, appended>
//   ```
function parseExample(name: string, body: string): ParsedExample {
  const lines = body.split('\n')
  let titleLine: string | undefined
  let i = 0
  if (lines[0]?.startsWith('# ')) {
    titleLine = lines[0].slice(2).trim()
    i = 1
  }
  const rest = lines.slice(i).join('\n').trim()

  // extract all fenced code blocks. concatenate them into a single code
  // string (the renderer can show the first one as the live example and
  // the rest as additional code samples).
  const code: string[] = []
  let description: string | undefined
  const descBuf: string[] = []
  let language = 'tsx'
  const fence = /```(\w+)?\s*$/
  const fenceEnd = /```\s*$/
  let inFence = false
  let fenceBuf: string[] = []
  let fenceLang = ''
  for (const line of rest.split('\n')) {
    if (!inFence) {
      const m = line.match(fence)
      if (m) {
        inFence = true
        fenceLang = m[1] ?? 'tsx'
        fenceBuf = []
        continue
      }
      descBuf.push(line)
    } else {
      if (fenceEnd.test(line)) {
        code.push(fenceBuf.join('\n'))
        language = fenceLang
        inFence = false
        fenceBuf = []
        continue
      }
      fenceBuf.push(line)
    }
  }
  const desc = descBuf.join('\n').trim()
  if (desc) description = desc

  return {
    name: titleLine ?? name,
    description,
    code: code.join('\n\n'),
    language,
  }
}

// ── type extraction ───────────────────────────────────────────────────

function defaultValueFromInitializer(init: ts.Expression): string | number | boolean | undefined {
  if (ts.isStringLiteral(init) || ts.isNoSubstitutionTemplateLiteral(init)) return init.text
  if (ts.isNumericLiteral(init)) return Number(init.text)
  if (init.kind === ts.SyntaxKind.TrueKeyword) return true
  if (init.kind === ts.SyntaxKind.FalseKeyword) return false
  if (ts.isIdentifier(init) && init.text === 'undefined') return undefined
  return undefined
}

// ── main entry: parse a single .tsx file ───────────────────────────────

function parseFromSourceFile(sourceFile: ts.SourceFile, filePath: string): ParsedItem {
  const errors: string[] = []

  // 1. find the default-exported function. three forms to handle:
  //   a) `export default function Button() {}`  — FunctionDeclaration with `export` modifier
  //   b) `export default function() {}`         — ExportAssignment with FunctionExpression
  //   c) `export default () => {}`              — ExportAssignment with ArrowFunction
  let defaultFn: ts.FunctionDeclaration | ts.FunctionExpression | ts.ArrowFunction | undefined
  let jsdocHost: ts.Node = sourceFile
  for (const stmt of sourceFile.statements) {
    if (ts.isFunctionDeclaration(stmt) && hasExportModifier(stmt)) {
      defaultFn = stmt
      jsdocHost = stmt
      break
    }
    if (ts.isExportAssignment(stmt) && !stmt.isExportEquals) {
      const expr = stmt.expression
      if (ts.isFunctionExpression(expr) || ts.isArrowFunction(expr)) {
        defaultFn = expr
        jsdocHost = stmt
        break
      }
    }
  }
  if (!defaultFn) {
    return { name: '', description: '', props: [], examples: [], errors: ['no default-exported function found'] }
  }

  // 2. extract JSDoc above the default export.
  const jsdocRaw = (jsdocHost as any).jsDoc ?? []
  const jsdocText: string[] = []
  for (const tag of jsdocRaw as ts.JSDoc[]) jsdocText.push(tag.getText(sourceFile))
  const jsdocComment = jsdocText.join('\n')
  const { description, tags } = parseJSDoc(jsdocComment)

  // 3. function name (from declaration) — fallback to file basename
  let name = ''
  if (defaultFn.name) name = defaultFn.name.text
  if (!name) {
    const fileName = filePath.split('/').pop() ?? ''
    name = toPascal(fileName.replace(/\.tsx?$/, ''))
  }

  // 4. examples from @example tags
  const examples: ParsedExample[] = (tags.example ?? []).map((body, i) =>
    parseExample(`Example ${i + 1}`, body)
  )

  // 5. props from the first param's type literal
  const props: ParsedProp[] = []
  const firstParam = defaultFn.parameters[0]
  if (firstParam) {
    // type annotation on the parameter works for both forms:
    //   fn(props: { variant: string })
    //   fn({ variant }: { variant: string })
    // the destructured binding pattern's defaults are read separately below.
    const typeNode = firstParam.type

    // collect destructured defaults: { variant = 'primary' } → { variant: 'primary' }
    const destructuredDefaults: Record<string, string | number | boolean> = {}
    if (ts.isObjectBindingPattern(firstParam.name)) {
      for (const el of firstParam.name.elements) {
        if (ts.isBindingElement(el) && el.initializer) {
          const dv = defaultValueFromInitializer(el.initializer)
          if (dv !== undefined) destructuredDefaults[el.name.getText()] = dv
        }
      }
    }

    if (typeNode && ts.isTypeLiteralNode(typeNode)) {
      // we don't have a Program-level type checker here, so we do best-effort
      // type extraction from the syntax tree. for unions of string literals
      // we can detect `enum` directly; for everything else we infer from
      // the type node's kind.
      for (const member of typeNode.members) {
        if (!ts.isPropertySignature(member) || !member.name || !member.type) continue
        const propName = (member.name as ts.Identifier).text
        const propType = inferPropTypeFromNode(member.type)
        const jsDocRaw = extractPropJsDocText(member)
        const desc = jsDocRaw ? propDescription(jsDocRaw) : undefined
        const values = propType === 'enum' ? extractEnumValuesFromNode(member.type) : undefined
        const defaultFromTag = jsDocRaw ? propTag(jsDocRaw, 'default') : undefined
        const defaultFromDestructure = destructuredDefaults[propName]
        const isOptional = !!member.questionToken
        props.push({
          name: propName,
          type: propType,
          values,
          description: desc,
          default: defaultFromDestructure ?? parseDefaultLiteral(defaultFromTag),
          required: !isOptional && !defaultFromDestructure,
        })
      }
    }
  }

  return { name, description, props, examples, errors }
}

function inferPropTypeFromNode(node: ts.TypeNode): ParsedProp['type'] {
  if (ts.isUnionTypeNode(node)) {
    let literalCount = 0
    let allLiterals = true
    for (const t of node.types) {
      if (isStringLiteralType(t)) literalCount++
      else { allLiterals = false; break }
    }
    if (allLiterals && literalCount > 0) return 'enum'
  }
  if (node.kind === ts.SyntaxKind.StringKeyword || ts.isStringLiteral(node)) return 'string'
  if (node.kind === ts.SyntaxKind.NumberKeyword || ts.isNumericLiteral(node)) return 'number'
  if (node.kind === ts.SyntaxKind.BooleanKeyword || node.kind === ts.SyntaxKind.TrueKeyword || node.kind === ts.SyntaxKind.FalseKeyword) return 'boolean'
  const text = node.getText()
  if (text.includes('ReactNode') || text.includes('ReactElement') || text.includes('JSX.Element')) return 'react-node'
  return 'string'
}

// in type position, `'primary'` is wrapped in a LiteralTypeNode. in expression
// position, it's a StringLiteral directly. this handles both.
function isStringLiteralType(node: ts.TypeNode): node is ts.LiteralTypeNode {
  if (ts.isStringLiteral(node)) return true
  if (ts.isLiteralTypeNode(node) && ts.isStringLiteral(node.literal)) return true
  return false
}

function stringLiteralValue(node: ts.TypeNode): string | undefined {
  if (ts.isStringLiteral(node)) return node.text
  if (ts.isLiteralTypeNode(node) && ts.isStringLiteral(node.literal)) return node.literal.text
  return undefined
}

function extractEnumValuesFromNode(node: ts.TypeNode): string[] {
  if (!ts.isUnionTypeNode(node)) return []
  const out: string[] = []
  for (const t of node.types) {
    const v = stringLiteralValue(t)
    if (v !== undefined) out.push(v)
  }
  return out
}

// JSDoc on a property can be a single string (single-line /** foo */) or
// an array of comment pieces (multi-line). normalize to a single /** ... */
// string for parseJSDoc.
function extractPropJsDocText(member: ts.PropertySignature): string {
  const node = (member as any).jsDoc?.[0]
  if (!node) return ''
  const c = node.comment
  if (typeof c === 'string') {
    // single-line comment: just wrap it back in /** ... */
    return `/** ${c} */`
  }
  if (Array.isArray(c)) {
    // multi-line: concatenate the text pieces
    const text = c.map((p) => p.text ?? '').join('')
    return `/** ${text} */`
  }
  return ''
}

function parseDefaultLiteral(raw: string | undefined): string | number | boolean | undefined {
  if (raw === undefined) return undefined
  if (raw === 'true') return true
  if (raw === 'false') return false
  if (/^-?\d+(\.\d+)?$/.test(raw)) return Number(raw)
  // strip surrounding quotes
  const m = raw.match(/^['"](.+)['"]$/)
  if (m) return m[1]
  return raw
}

function toPascal(s: string): string {
  return s
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((w) => w[0]!.toUpperCase() + w.slice(1))
    .join('')
}

// ── sync variant: parse a string (used by build-time plugins) ─────────

export function parseItemSource(src: string, filePath = '<source>'): ParsedItem {
  const sourceFile = ts.createSourceFile(filePath, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  return parseFromSourceFile(sourceFile, filePath)
}

function hasExportModifier(node: ts.Node): boolean {
  return (ts.getCombinedModifierFlags(node as ts.Declaration) & ts.ModifierFlags.Export) !== 0
}

