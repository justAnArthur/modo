import { statSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import ts from 'typescript'
import { isModoPackage, packageDirOf, resolveSourceExport } from './resolve-source'
import {
  applyPropDoc,
  type DocComment,
  normalizeJsdoc,
  type ParsedItem,
  type ParsedProp,
  parseDocComment,
} from './tsdoc'

/**
 * Reads items through the TypeScript compiler: the default export is followed
 * through re-exports and imports to its declaration, whose JSDoc is the item's
 * docs, and the props come from the checker (inherited members included).
 */
export interface DocsService {
  /** Starts a run over these item files: one program serves every `parse` until the next call. */
  refresh(roots: string[]): void
  parse(file: string): ParsedItem
}

interface Docs extends DocComment {
  sources: string[]
}

const INHERIT_DOC = /\{@inheritDoc\s+([^\s}]+)\s*\}/g
const NODE_MODULES = /[\\/]node_modules[\\/]/
const TYPES_PACKAGE = /[\\/]node_modules[\\/]@types[\\/]/

export function createDocsService(opts: { root: string; overlay?: Map<string, string> }): DocsService {
  const overlay = opts.overlay ?? new Map<string, string>()
  const options = compilerOptions(opts.root)
  const readFile = (file: string) => overlay.get(file) ?? ts.sys.readFile(file)
  const fileExists = (file: string) => overlay.has(file) || ts.sys.fileExists(file)
  const moduleHost: ts.ModuleResolutionHost = {
    fileExists,
    readFile,
    realpath: ts.sys.realpath,
    directoryExists: ts.sys.directoryExists,
    getDirectories: ts.sys.getDirectories,
    getCurrentDirectory: () => opts.root,
  }
  const resolutionCache = ts.createModuleResolutionCache(opts.root, f => f, options)
  const sourceExports = new Map<string, string | null>()
  // Per run: files don't change while one program is in use.
  const versions = new Map<string, string>()
  let roots: string[] = []
  let projectVersion = 0

  function resolveModule(spec: string, containingFile: string): ts.ResolvedModuleWithFailedLookupLocations {
    const from = dirname(containingFile)
    const key = `${from}\0${spec}`
    let source = sourceExports.get(key)
    if (source === undefined) {
      source = resolveSourceExport(spec, from)
      sourceExports.set(key, source)
    }
    if (source) {
      return {
        resolvedModule: { resolvedFileName: source, extension: extensionOf(source), isExternalLibraryImport: false },
      }
    }
    return ts.resolveModuleName(spec, containingFile, options, moduleHost, resolutionCache)
  }

  const host: ts.LanguageServiceHost = {
    ...moduleHost,
    getCurrentDirectory: () => opts.root,
    getProjectVersion: () => String(projectVersion),
    getScriptFileNames: () => roots,
    getScriptVersion(file) {
      let version = versions.get(file)
      if (version !== undefined) return version
      if (overlay.has(file)) version = overlay.get(file)!
      else {
        try {
          version = String(statSync(file).mtimeMs)
        } catch {
          version = ''
        }
      }
      versions.set(file, version)
      return version
    },
    getScriptSnapshot(file) {
      const text = readFile(file)
      return text === undefined ? undefined : ts.ScriptSnapshot.fromString(text)
    },
    getCompilationSettings: () => options,
    getDefaultLibFileName: o => ts.getDefaultLibFilePath(o),
    useCaseSensitiveFileNames: () => ts.sys.useCaseSensitiveFileNames,
    resolveModuleNameLiterals: (literals, containingFile) => literals.map(l => resolveModule(l.text, containingFile)),
  }
  const service = ts.createLanguageService(host, ts.createDocumentRegistry())
  let program: ts.Program | undefined

  function sourceFile(file: string): ts.SourceFile | undefined {
    program ??= service.getProgram()
    const hit = program?.getSourceFile(file)
    if (hit || !fileExists(file)) return hit
    // Not imported by any item (an `{@inheritDoc}` base): add it.
    roots = [...roots, file]
    projectVersion++
    program = service.getProgram()
    return program?.getSourceFile(file)
  }

  const documentedFiles = new Map<string, boolean>()

  function parse(file: string): ParsedItem {
    const sf = sourceFile(file)
    if (!sf || !program) return fail(`Could not read ${file}`)
    const checker = program.getTypeChecker()
    const target = defaultExport(checker, sf)
    if (!target) return fail('No `export default` found')
    const decl = declarationOf(target)
    if (!decl) return fail(`Could not resolve the default export${reexportSpecifier(sf)}`)

    const docs = docsOf(decl, new Set())
    // Members declared in a source file, or in a package the docs came from
    // or documented with modo, count; React's DOM attributes and other
    // libraries' props (.d.ts in node_modules) stay out unless re-declared.
    const docPackages = new Set(docs.sources.map(packageDirOf))
    const documented = (f: string) => {
      if (!NODE_MODULES.test(f)) return true
      let hit = documentedFiles.get(f)
      if (hit === undefined) {
        const pkg = TYPES_PACKAGE.test(f) ? null : packageDirOf(f)
        hit = pkg !== null && isModoPackage(pkg)
        documentedFiles.set(f, hit)
      }
      return hit || docPackages.has(packageDirOf(f))
    }
    const props = propsOf(program.getTypeChecker(), target, decl, documented)

    return {
      name: exportedName(sf) ?? declarationName(decl) ?? '',
      description: docs.description,
      props: props.props,
      examples: docs.examples,
      exampleDocs: docs.exampleDocs,
      sources: docs.sources,
      errors: [...docs.errors, ...props.errors],
    }
  }

  function docsOf(decl: ts.Declaration, seen: Set<ts.Node>): Docs {
    const sf = decl.getSourceFile()
    const dir = dirname(sf.fileName)
    if (seen.has(decl)) return { ...emptyDocs(), errors: ['{@inheritDoc}: circular'] }
    seen.add(decl)

    const errors: string[] = []
    const inherited: Docs[] = []
    const jsdoc = jsdocAbove(docHost(decl)).replace(INHERIT_DOC, (tag, ref: string) => {
      const base = inheritTarget(ref, sf)
      if (base) inherited.push(docsOf(base, seen))
      else errors.push(`${tag}: could not resolve "${ref}"`)
      return ''
    })
    const own = parseDocComment(jsdoc.trim(), path => {
      const abs = resolve(dir, path)
      return fileExists(abs) ? (readFile(abs) ?? null) : null
    })

    return {
      description: [...inherited.map(d => d.description), own.description].filter(Boolean).join('\n\n'),
      examples: [...inherited.flatMap(d => d.examples), ...own.examples],
      exampleDocs: [...inherited.flatMap(d => d.exampleDocs), ...own.exampleDocs.map(p => resolve(dir, p))],
      sources: [sf.fileName, ...inherited.flatMap(d => d.sources)],
      errors: [...errors, ...inherited.flatMap(d => d.errors), ...own.errors],
    }
  }

  /** `{@inheritDoc <ref>}`: a module specifier (its default export) or a name in the file's scope. */
  function inheritTarget(ref: string, from: ts.SourceFile): ts.Declaration | undefined {
    if (/^[A-Za-z_$][\w$]*$/.test(ref)) {
      const checker = program!.getTypeChecker()
      const local = checker
        .getSymbolsInScope(from, ts.SymbolFlags.Value | ts.SymbolFlags.Alias)
        .find(s => s.name === ref)
      if (!local) return undefined
      return declarationOf(local.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(local) : local)
    }
    const file = resolveModule(ref, from.fileName).resolvedModule?.resolvedFileName
    const sf = file ? sourceFile(file) : undefined
    if (!sf) return undefined
    const target = defaultExport(program!.getTypeChecker(), sf)
    return target && declarationOf(target)
  }

  return {
    refresh(files) {
      roots = files
      versions.clear()
      sourceExports.clear()
      projectVersion++
      program = undefined
    },
    parse,
  }
}

/** Parses one item's source (no other files of its own): what `parse` sees for an `index.tsx`. */
export function parseItemSource(src: string, file = resolve('__modo__', 'index.tsx')): ParsedItem {
  const service = createDocsService({ root: dirname(file), overlay: new Map([[file, src]]) })
  service.refresh([file])
  return service.parse(file)
}

function compilerOptions(root: string): ts.CompilerOptions {
  const configFile = ts.findConfigFile(root, ts.sys.fileExists)
  const host = { ...ts.sys, onUnRecoverableConfigFileDiagnostic: () => {} }
  const parsed = configFile ? ts.getParsedCommandLineOfConfigFile(configFile, {}, host)?.options : undefined
  return {
    jsx: ts.JsxEmit.ReactJSX,
    ...parsed,
    // The host's paths and jsx settings stay; how modules resolve is the
    // bundler's (esbuild builds the items), and nothing is emitted or checked.
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    allowImportingTsExtensions: true,
    resolveJsonModule: true,
    allowJs: false,
    noEmit: true,
    skipLibCheck: true,
    types: [],
    composite: false,
    incremental: false,
    declaration: false,
  }
}

// resolveSourceExport only lands on .ts/.tsx/.mts/.cts sources.
function extensionOf(file: string): ts.Extension {
  return (file.match(/\.[cm]?tsx?$/)?.[0] ?? '.ts') as ts.Extension
}

function fail(msg: string): ParsedItem {
  return { ...emptyDocs(), name: '', props: [], errors: [msg] }
}

function emptyDocs(): Docs {
  return { description: '', examples: [], exampleDocs: [], sources: [], errors: [] }
}

function defaultExport(checker: ts.TypeChecker, sf: ts.SourceFile): ts.Symbol | undefined {
  const mod = checker.getSymbolAtLocation(sf)
  const def = mod && checker.getExportsOfModule(mod).find(s => s.escapedName === 'default')
  if (!def) return undefined
  return def.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(def) : def
}

function declarationOf(sym: ts.Symbol): ts.Declaration | undefined {
  return sym.valueDeclaration ?? sym.declarations?.[0]
}

/** The node a doc block sits on: a const's statement, else the declaration itself. */
function docHost(decl: ts.Node): ts.Node {
  if (ts.isVariableDeclaration(decl) && ts.isVariableDeclarationList(decl.parent)) return decl.parent.parent
  return decl
}

// The last `/** */` in the node's leading trivia (whitespace and comments
// only), so a prop's or sibling's doc is never taken for it. Read from the
// text: the scanner's leading comments skip one on the same line as the
// previous token (`{ /** A. */ a: string }`).
function jsdocAbove(node: ts.Node): string {
  const trivia = node.getSourceFile().text.slice(node.getFullStart(), node.getStart())
  const block = [...trivia.matchAll(/\/\*\*([\s\S]*?)\*\//g)].at(-1)
  return block ? normalizeJsdoc(block[1] ?? '') : ''
}

/** The name the item file binds: `export default X`, `export { X as default }`. */
function exportedName(sf: ts.SourceFile): string | undefined {
  for (const st of sf.statements) {
    if (ts.isExportAssignment(st) && !st.isExportEquals && ts.isIdentifier(st.expression)) return st.expression.text
    if (!ts.isExportDeclaration(st) || !st.exportClause || !ts.isNamedExports(st.exportClause)) continue
    const el = st.exportClause.elements.find(e => e.name.text === 'default')
    const local = el?.propertyName?.text
    if (el) return local && local !== 'default' ? local : undefined
  }
  return undefined
}

function declarationName(decl: ts.Declaration): string | undefined {
  const name = (decl as { name?: ts.Node }).name
  return name && ts.isIdentifier(name) ? name.text : undefined
}

function reexportSpecifier(sf: ts.SourceFile): string {
  for (const st of sf.statements) {
    const spec = ts.isExportDeclaration(st) || ts.isImportDeclaration(st) ? st.moduleSpecifier : undefined
    if (spec && ts.isStringLiteral(spec)) return ` from "${spec.text}"`
  }
  return ''
}

function unwrap(node: ts.Expression): ts.Expression {
  let n = node
  while (
    ts.isParenthesizedExpression(n) ||
    ts.isAsExpression(n) ||
    ts.isSatisfiesExpression(n) ||
    ts.isNonNullExpression(n)
  )
    n = n.expression
  return n
}

function initializerOf(decl: ts.Declaration): ts.Expression | undefined {
  if (ts.isVariableDeclaration(decl)) return decl.initializer
  if (ts.isExportAssignment(decl)) return decl.expression
  return undefined
}

/** The function rendering the component: the declaration, or the first one passed down a `forwardRef(…)` / `memo(…)` chain. */
function implementation(decl: ts.Declaration): ts.SignatureDeclaration | undefined {
  if (ts.isFunctionDeclaration(decl)) return decl
  const find = (node: ts.Expression | undefined): ts.SignatureDeclaration | undefined => {
    if (!node) return undefined
    const n = unwrap(node)
    if (ts.isArrowFunction(n) || ts.isFunctionExpression(n)) return n
    if (ts.isCallExpression(n))
      for (const arg of n.arguments) {
        const hit = find(arg)
        if (hit) return hit
      }
    return undefined
  }
  return find(initializerOf(decl))
}

/** `forwardRef<El, Props>(…)` anywhere in the initializer: its `Props`. */
function forwardRefProps(decl: ts.Declaration): ts.TypeNode | undefined {
  const find = (node: ts.Expression | undefined): ts.TypeNode | undefined => {
    if (!node) return undefined
    const n = unwrap(node)
    if (!ts.isCallExpression(n)) return undefined
    const callee = n.expression.getText()
    if (/(?:^|\.)forwardRef$/.test(callee) && n.typeArguments?.length === 2) return n.typeArguments[1]
    for (const arg of n.arguments) {
      const hit = find(arg)
      if (hit) return hit
    }
    return undefined
  }
  return find(initializerOf(decl))
}

interface PropsResult {
  props: ParsedProp[]
  errors: string[]
}

function propsOf(
  checker: ts.TypeChecker,
  sym: ts.Symbol,
  decl: ts.Declaration,
  documented: (file: string) => boolean,
): PropsResult {
  const impl = implementation(decl)
  const param = impl?.parameters[0]
  // From the annotation when there is one: cheaper than the component's
  // type, which infers the render function's return type.
  const annotation = param?.type ?? forwardRefProps(decl)
  let type = annotation && checker.getTypeFromTypeNode(annotation)
  if (!type) {
    const own = checker.getTypeOfSymbolAtLocation(sym, decl)
    const signature = own.getCallSignatures()[0] ?? own.getConstructSignatures()[0]
    if (!signature) return { props: [], errors: ['The default export is not a component'] }
    const first = signature.getParameters()[0]
    if (!first) return { props: [], errors: [] }
    type = checker.getTypeOfSymbolAtLocation(first, decl)
  }

  // The code's own default wins over a documented `@default`.
  const defaults = new Map<string, string>()
  if (impl && ts.isFunctionDeclaration(impl) && param && ts.isObjectBindingPattern(param.name)) {
    for (const el of param.name.elements) {
      const key = el.propertyName ?? el.name
      if (!el.dotDotDotToken && el.initializer && (ts.isIdentifier(key) || ts.isStringLiteral(key)))
        defaults.set(key.text, el.initializer.getText())
    }
  }

  // Members a type declares (an interface, a type literal, a class); not
  // keys an object literal yields through inference (cva's `VariantProps`).
  const declared = (d: ts.Declaration) =>
    !ts.isObjectLiteralExpression(d.parent) && documented(d.getSourceFile().fileName)
  const found: Array<{ prop: ParsedProp; decl: ts.Declaration }> = []
  for (const { symbol, optional } of membersOf(checker, type)) {
    const decl = symbol.declarations?.find(declared)
    if (!decl) continue
    const prop: ParsedProp = { name: symbol.name, optional, type: typeText(checker, symbol, decl) }
    const doc = jsdocAbove(decl)
    if (doc) applyPropDoc(prop, doc)
    const def = defaults.get(prop.name)
    if (def) prop.default = def
    found.push({ prop, decl })
  }
  return { props: inSourceOrder(found), errors: [] }
}

// The checker lists an intersection's props by the operand that first has
// them (`DayPickerProps & { className }` puts `className` first); the table
// follows the declarations instead: by declaring type, in the order the
// types first appear, then by position.
function inSourceOrder(found: Array<{ prop: ParsedProp; decl: ts.Declaration }>): ParsedProp[] {
  const containers: ts.Node[] = []
  for (const { decl } of found) if (!containers.includes(decl.parent)) containers.push(decl.parent)
  return [...found]
    .sort((a, b) => containers.indexOf(a.decl.parent) - containers.indexOf(b.decl.parent) || a.decl.pos - b.decl.pos)
    .map(f => f.prop)
}

/** Props of a type; a union's are merged, optional unless every member has them. */
function membersOf(checker: ts.TypeChecker, type: ts.Type): Array<{ symbol: ts.Symbol; optional: boolean }> {
  const isOptional = (s: ts.Symbol) => (s.flags & ts.SymbolFlags.Optional) !== 0
  const parts = type.isUnion()
    ? type.types.filter(t => t.flags & (ts.TypeFlags.Object | ts.TypeFlags.Intersection))
    : [type]
  if (parts.length === 1)
    return checker.getPropertiesOfType(parts[0]!).map(symbol => ({ symbol, optional: isOptional(symbol) }))

  const merged = new Map<string, { symbol: ts.Symbol; optional: boolean; count: number }>()
  for (const part of parts) {
    for (const symbol of checker.getPropertiesOfType(part)) {
      const hit = merged.get(symbol.name)
      if (hit) {
        hit.count++
        hit.optional ||= isOptional(symbol)
      } else merged.set(symbol.name, { symbol, optional: isOptional(symbol), count: 1 })
    }
  }
  return [...merged.values()].map(m => ({ symbol: m.symbol, optional: m.optional || m.count < parts.length }))
}

function typeText(checker: ts.TypeChecker, symbol: ts.Symbol, d: ts.Declaration): string {
  const clean = (s: string) =>
    s
      .trim()
      .replace(/^\|\s*/, '')
      .replace(/\s+/g, ' ')
  if ((ts.isPropertySignature(d) || ts.isPropertyDeclaration(d)) && d.type) return clean(d.type.getText())
  if (ts.isMethodSignature(d) || ts.isMethodDeclaration(d))
    return clean(`(${d.parameters.map(p => p.getText()).join(', ')}) => ${d.type?.getText() ?? 'void'}`)
  return checker.typeToString(checker.getTypeOfSymbolAtLocation(symbol, d), undefined, ts.TypeFormatFlags.NoTruncation)
}
