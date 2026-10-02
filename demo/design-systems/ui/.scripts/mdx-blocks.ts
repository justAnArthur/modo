import ts from 'typescript'

export interface MdxBlock {
  code: string
  /** 1-based line of the block's first line in the .mdx file. */
  line: number
}

const parses = (code: string) =>
  (ts.createSourceFile('block.tsx', `const __b = <>${code}</>`, ts.ScriptTarget.Latest, false, ts.ScriptKind.TSX) as unknown as {
    parseDiagnostics: unknown[]
  }).parseDiagnostics.length === 0

/**
 * The top-level JSX blocks of an examples.mdx — what modo turns into live
 * examples. A block starts at a line opening with `<` and ends at the first
 * line where it parses as complete JSX; fenced code is skipped.
 */
export function mdxBlocks(source: string): MdxBlock[] {
  const lines = source.split('\n')
  const blocks: MdxBlock[] = []
  for (let i = 0; i < lines.length; i++) {
    if (lines[i]!.startsWith('```')) {
      while (++i < lines.length && !lines[i]!.startsWith('```'));
      continue
    }

    if (!lines[i]!.startsWith('<')) continue

    for (let end = i; end < lines.length; end++) {
      const code = lines.slice(i, end + 1).join('\n')
      if (!parses(code)) continue
      blocks.push({ code, line: i + 1 })
      i = end
      break
    }
  }
  return blocks
}

/** Names bound by the file's single-line `import` statements. */
export function mdxImports(source: string): Set<string> {
  const imports = source.split('\n').filter((l) => l.startsWith('import ')).join('\n')
  const sf = ts.createSourceFile('imports.ts', imports, ts.ScriptTarget.Latest, false)
  const names = new Set<string>()
  for (const statement of sf.statements) {
    const clause = ts.isImportDeclaration(statement) ? statement.importClause : undefined
    if (clause?.name) names.add(clause.name.text)
    const bindings = clause?.namedBindings
    if (bindings && ts.isNamespaceImport(bindings)) names.add(bindings.name.text)
    if (bindings && ts.isNamedImports(bindings)) for (const el of bindings.elements) names.add(el.name.text)
  }
  return names
}
