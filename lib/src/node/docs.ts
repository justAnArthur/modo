import { statSync } from 'node:fs'
import { dirname, isAbsolute, relative, resolve } from 'node:path'
import type TS from 'typescript'
import {
  applyCodeDefault,
  applyPropDoc,
  type DocComment,
  normalizeJsdoc,
  type ParsedItem,
  type ParsedProp,
  parseDocComment,
} from '../lib/tsdoc'
import { isModoPackage, packageDirOf, resolveSourceExport } from './resolve-ref'

/**
 * Reads items through the TypeScript compiler: the default export is followed through
 * re-exports and imports to its declaration, whose doc comment is the item's docs, and the
 * props come from the checker (inherited members included).
 */
export interface DocsService {
  /** Starts a run over these item files: one program serves every `parse` until the next call. */
  refresh(files: string[]): void
  /** `mdxExamples` come back absolute. */
  parse(file: string): ParsedItem
}

interface DocsOptions {
  /** The project root: its tsconfig's `paths` and `jsx` apply, and its files may be included. */
  root: string
  /** File contents that take the place of the disk's (tests). */
  overlay?: Map<string, string>
}

// A peer dependency: without it the caller keeps the plain parser.
let ts: typeof TS

/** Null when `typescript` isn't installed. */
export async function createDocsService(opts: DocsOptions): Promise<DocsService | null> {
  try {
    ts ??= (await import('typescript')).default
  } catch {
    return null
  }
  return docsService(opts)
}

interface Docs extends DocComment {
  /** The files the docs were read from, the declaration's first. */
  sources: string[]
}

const INHERIT_DOC = /\{@inheritDoc\s+([^\s}]+)\s*\}/g
const NODE_MODULES = /[\\/]node_modules[\\/]/
const TYPES_PACKAGE = /[\\/]node_modules[\\/]@types[\\/]/

function docsService({ root, overlay = new Map() }: DocsOptions): DocsService {
  const options = compilerOptions(root)
  const readFile = (file: string) => overlay.get(file) ?? ts.sys.readFile(file)
  const fileExists = (file: string) => overlay.has(file) || ts.sys.fileExists(file)
  const moduleHost: TS.ModuleResolutionHost = {
    fileExists,
    readFile,
    realpath: ts.sys.realpath,
    directoryExists: dir => ts.sys.directoryExists(dir) || [...overlay.keys()].some(f => f.startsWith(`${dir}/`)),
    getDirectories: ts.sys.getDirectories,
    getCurrentDirectory: () => root,
  }

  // Lookups are fresh each run: a failed import must not outlive the creation of its file.
  // A file whose import failed gets a new version next run, so the service re-reads it
  // instead of reusing an unchanged file's resolutions.
  const resolutionCache = ts.createModuleResolutionCache(root, f => f, options)
  const sourceExports = new Map<string, string | null>()
  const documentedFiles = new Map<string, boolean>()
  const versions = new Map<string, string>()
  let failedIn = new Set<string>()
  let invalidated = new Set<string>()
  let roots: string[] = []
  let projectVersion = 0

  function resolveModule(spec: string, containingFile: string): TS.ResolvedModuleWithFailedLookupLocations {
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
    const resolved = ts.resolveModuleName(spec, containingFile, options, moduleHost, resolutionCache)
    // Installed typings may leave optional imports unresolved for good.
    if (!resolved.resolvedModule && !NODE_MODULES.test(containingFile)) failedIn.add(containingFile)
    return resolved
  }

  const host: TS.LanguageServiceHost = {
    ...moduleHost,
    getCurrentDirectory: () => root,
    getProjectVersion: () => String(projectVersion),
    getScriptFileNames: () => roots,
    getScriptVersion(file) {
      let version = versions.get(file)
      if (version !== undefined) return version
      version = overlay.get(file) ?? mtime(file)
      if (invalidated.has(file)) version += `:${projectVersion}`
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
  let program: TS.Program | undefined

  function sourceFile(file: string): TS.SourceFile | undefined {
    program ??= service.getProgram()
    const hit = program?.getSourceFile(file)
    if (hit || !fileExists(file)) return hit
    // An `{@inheritDoc}` base no item imports: add it to this run's program.
    roots = [...roots, file]
    projectVersion++
    program = service.getProgram()
    return program?.getSourceFile(file)
  }

  // Members declared in a source file count, or in a package the docs came from or that is
  // documented with modo; React's DOM attributes and other libraries' props (.d.ts in
  // node_modules) stay out unless the item re-declares them.
  function documentedIn(sources: string[]): (file: string) => boolean {
    const docPackages = new Set(sources.map(packageDirOf))
    return file => {
      if (!NODE_MODULES.test(file)) return true
      let hit = documentedFiles.get(file)
      if (hit === undefined) {
        const pkg = TYPES_PACKAGE.test(file) ? null : packageDirOf(file)
        hit = pkg !== null && isModoPackage(pkg)
        documentedFiles.set(file, hit)
      }
      return hit || docPackages.has(packageDirOf(file))
    }
  }

  function parse(file: string): ParsedItem {
    const sf = sourceFile(file)
    if (!sf || !program) return fail(`Could not read ${file}`)
    const checker = program.getTypeChecker()
    const target = defaultExport(checker, sf)
    if (!target) return fail('No `export default` found')
    const decl = declarationOf(target)
    if (!decl) return fail(`Could not resolve the default export${reexportSpecifier(sf)}`)

    const { sources, errors, ...docs } = docsOf(decl, new Set())
    const props = propsOf(program.getTypeChecker(), target, decl, documentedIn(sources))
    return {
      ...docs,
      name: exportedName(sf) ?? declarationName(decl) ?? '',
      props: props.props,
      errors: [...errors, ...props.errors],
    }
  }

  // `seen` holds the current inheritance path only, so two bases sharing a base (a
  // diamond) aren't taken for a cycle.
  function docsOf(decl: TS.Declaration, seen: Set<TS.Node>): Docs {
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
    seen.delete(decl)

    // Includes stay inside the package the comment belongs to (and the project, for its
    // own files): docs followed into node_modules must not inline arbitrary local files
    // into a published site.
    const allowed = includeRoots(sf.fileName)
    const inside = (abs: string) => allowed.some(dir => isInside(dir, abs))
    const own = parseDocComment(jsdoc.trim(), path => {
      const abs = resolve(dir, path)
      return inside(abs) && fileExists(abs) ? (readFile(abs) ?? null) : null
    })
    const mdxExamples: string[] = []
    for (const path of own.mdxExamples) {
      const abs = resolve(dir, path)
      if (inside(abs)) mdxExamples.push(abs)
      else errors.push(`@example {@include ${path}}: outside ${allowed.join(', ')}`)
    }

    return {
      description: [...inherited.map(d => d.description), own.description].filter(Boolean).join('\n\n'),
      examples: [...inherited.flatMap(d => d.examples), ...own.examples],
      mdxExamples: [...inherited.flatMap(d => d.mdxExamples), ...mdxExamples],
      // Lifecycle and provenance are the item's own: a wrapper doesn't inherit `@deprecated`.
      tags: own.tags,
      sources: [sf.fileName, ...inherited.flatMap(d => d.sources)],
      errors: [...errors, ...inherited.flatMap(d => d.errors), ...own.errors],
    }
  }

  function includeRoots(file: string): string[] {
    const pkg = packageDirOf(file)
    if (NODE_MODULES.test(file)) return pkg ? [pkg] : []
    return pkg ? [pkg, root] : [root]
  }

  /** `{@inheritDoc <ref>}`: a module specifier (its default export) or a name in the file's scope. */
  function inheritTarget(ref: string, from: TS.SourceFile): TS.Declaration | undefined {
    const checker = program!.getTypeChecker()
    if (/^[A-Za-z_$][\w$]*$/.test(ref)) {
      const local = checker
        .getSymbolsInScope(from, ts.SymbolFlags.Value | ts.SymbolFlags.Alias)
        .find(s => s.name === ref)
      if (!local) return undefined
      return declarationOf(local.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(local) : local)
    }
    const file = resolveModule(ref, from.fileName).resolvedModule?.resolvedFileName
    const sf = file ? sourceFile(file) : undefined
    // `sourceFile` may have built a new program.
    const target = sf && defaultExport(program!.getTypeChecker(), sf)
    return target && declarationOf(target)
  }

  return {
    refresh(files) {
      roots = files
      versions.clear()
      sourceExports.clear()
      resolutionCache.clear()
      documentedFiles.clear()
      invalidated = failedIn
      failedIn = new Set()
      projectVersion++
      program = undefined
    },
    parse,
  }
}

function mtime(file: string): string {
  try {
    return String(statSync(file).mtimeMs)
  } catch {
    return ''
  }
}

function compilerOptions(root: string): TS.CompilerOptions {
  const configFile = ts.findConfigFile(root, ts.sys.fileExists)
  const host = { ...ts.sys, onUnRecoverableConfigFileDiagnostic: () => {} }
  const parsed = configFile ? ts.getParsedCommandLineOfConfigFile(configFile, {}, host)?.options : undefined
  return {
    jsx: ts.JsxEmit.ReactJSX,
    ...parsed,
    // The host's `paths` and `jsx` stay; modules resolve as the bundler's (esbuild builds
    // the items), and nothing is emitted or checked.
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

// resolveSourceExport only lands on .ts/.tsx/.mts/.cts files.
function extensionOf(file: string): TS.Extension {
  return (file.match(/\.[cm]?tsx?$/)?.[0] ?? '.ts') as TS.Extension
}

function isInside(dir: string, file: string): boolean {
  const rel = relative(dir, file)
  return rel === '' || (!rel.startsWith('..') && !isAbsolute(rel))
}

function fail(msg: string): ParsedItem {
  return { ...emptyDocs(), name: '', props: [], errors: [msg] }
}

function emptyDocs(): Docs {
  return { description: '', examples: [], mdxExamples: [], tags: [], sources: [], errors: [] }
}

function defaultExport(checker: TS.TypeChecker, sf: TS.SourceFile): TS.Symbol | undefined {
  const mod = checker.getSymbolAtLocation(sf)
  const def = mod && checker.getExportsOfModule(mod).find(s => s.escapedName === 'default')
  if (!def) return undefined
  return def.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(def) : def
}

function declarationOf(sym: TS.Symbol): TS.Declaration | undefined {
  return sym.valueDeclaration ?? sym.declarations?.[0]
}

/** The node a doc block sits on: a const's statement, else the declaration itself. */
function docHost(decl: TS.Node): TS.Node {
  if (ts.isVariableDeclaration(decl) && ts.isVariableDeclarationList(decl.parent)) return decl.parent.parent
  return decl
}

// The last `/** */` in the node's leading trivia, so a prop's or sibling's doc is never
// taken for it. Read from the text: the scanner's leading comments skip one on the same
// line as the previous token (`{ /** A. */ a: string }`).
function jsdocAbove(node: TS.Node): string {
  const trivia = node.getSourceFile().text.slice(node.getFullStart(), node.getStart())
  const block = [...trivia.matchAll(/\/\*\*([\s\S]*?)\*\//g)].at(-1)
  return block ? normalizeJsdoc(block[1] ?? '') : ''
}

/** The name the item file binds: `export default X`, `export { X as default }`. */
function exportedName(sf: TS.SourceFile): string | undefined {
  for (const st of sf.statements) {
    if (ts.isExportAssignment(st) && !st.isExportEquals && ts.isIdentifier(st.expression)) return st.expression.text
    if (!ts.isExportDeclaration(st) || !st.exportClause || !ts.isNamedExports(st.exportClause)) continue
    const el = st.exportClause.elements.find(e => e.name.text === 'default')
    const local = el?.propertyName?.text
    if (el) return local && local !== 'default' ? local : undefined
  }
  return undefined
}

function declarationName(decl: TS.Declaration): string | undefined {
  const name = (decl as { name?: TS.Node }).name
  return name && ts.isIdentifier(name) ? name.text : undefined
}

function reexportSpecifier(sf: TS.SourceFile): string {
  for (const st of sf.statements) {
    const spec = ts.isExportDeclaration(st) || ts.isImportDeclaration(st) ? st.moduleSpecifier : undefined
    if (spec && ts.isStringLiteral(spec)) return ` from "${spec.text}"`
  }
  return ''
}

function unwrap(node: TS.Expression): TS.Expression {
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

function initializerOf(decl: TS.Declaration): TS.Expression | undefined {
  if (ts.isVariableDeclaration(decl)) return decl.initializer
  if (ts.isExportAssignment(decl)) return decl.expression
  return undefined
}

/** The first call argument, depth first, down the initializer's call chain that `match` accepts. */
function findInCalls<T>(decl: TS.Declaration, match: (node: TS.Expression) => T | undefined): T | undefined {
  const find = (node: TS.Expression): T | undefined => {
    const n = unwrap(node)
    const hit = match(n)
    if (hit || !ts.isCallExpression(n)) return hit
    for (const arg of n.arguments) {
      const found = find(arg)
      if (found) return found
    }
    return undefined
  }
  const init = initializerOf(decl)
  return init && find(init)
}

/** The function rendering the component: the declaration, or the first one passed down a `forwardRef(…)` / `memo(…)` chain. */
function implementation(decl: TS.Declaration): TS.SignatureDeclaration | undefined {
  if (ts.isFunctionDeclaration(decl)) return decl
  return findInCalls(decl, n => (ts.isArrowFunction(n) || ts.isFunctionExpression(n) ? n : undefined))
}

/** `forwardRef<El, Props>(…)` anywhere in the initializer: its `Props`. */
function forwardRefProps(decl: TS.Declaration): TS.TypeNode | undefined {
  return findInCalls(decl, n =>
    ts.isCallExpression(n) && /(?:^|\.)forwardRef$/.test(n.expression.getText()) && n.typeArguments?.length === 2
      ? n.typeArguments[1]
      : undefined,
  )
}

interface PropsResult {
  props: ParsedProp[]
  errors: string[]
}

function propsOf(
  checker: TS.TypeChecker,
  sym: TS.Symbol,
  decl: TS.Declaration,
  documented: (file: string) => boolean,
): PropsResult {
  const param = implementation(decl)?.parameters[0]
  // The annotation when there is one: cheaper than the component's type, which infers
  // the render function's return type.
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

  const defaults = new Map<string, string>()
  if (param && ts.isObjectBindingPattern(param.name)) {
    for (const el of param.name.elements) {
      const key = el.propertyName ?? el.name
      if (!el.dotDotDotToken && el.initializer && (ts.isIdentifier(key) || ts.isStringLiteral(key)))
        defaults.set(key.text, el.initializer.getText())
    }
  }

  // Members a type declares (an interface, a type literal, a class); not keys an object
  // literal yields through inference (cva's `VariantProps`).
  const declared = (d: TS.Declaration) =>
    !ts.isObjectLiteralExpression(d.parent) && documented(d.getSourceFile().fileName)
  const found: Array<{ prop: ParsedProp; decl: TS.Declaration }> = []
  for (const { symbol, optional } of membersOf(checker, type)) {
    const decl = symbol.declarations?.find(declared)
    if (!decl) continue
    const prop: ParsedProp = { name: symbol.name, optional, type: typeText(checker, symbol, decl) }
    const doc = jsdocAbove(decl)
    if (doc) applyPropDoc(prop, doc)
    const def = defaults.get(prop.name)
    if (def) applyCodeDefault(prop, def)
    found.push({ prop, decl })
  }
  return { props: inSourceOrder(found), errors: [] }
}

// The checker lists an intersection's props by the operand that first has them
// (`DayPickerProps & { className }` puts `className` first); the table follows the
// declarations instead: by declaring type, in the order the types first appear, then by
// position.
function inSourceOrder(found: Array<{ prop: ParsedProp; decl: TS.Declaration }>): ParsedProp[] {
  const containers: TS.Node[] = []
  for (const { decl } of found) if (!containers.includes(decl.parent)) containers.push(decl.parent)
  return [...found]
    .sort((a, b) => containers.indexOf(a.decl.parent) - containers.indexOf(b.decl.parent) || a.decl.pos - b.decl.pos)
    .map(f => f.prop)
}

/** Props of a type; a union's are merged, optional unless every member has them. */
function membersOf(checker: TS.TypeChecker, type: TS.Type): Array<{ symbol: TS.Symbol; optional: boolean }> {
  const isOptional = (s: TS.Symbol) => (s.flags & ts.SymbolFlags.Optional) !== 0
  const parts = type.isUnion()
    ? type.types.filter(t => t.flags & (ts.TypeFlags.Object | ts.TypeFlags.Intersection))
    : [type]
  if (parts.length === 1)
    return checker.getPropertiesOfType(parts[0]!).map(symbol => ({ symbol, optional: isOptional(symbol) }))

  const merged = new Map<string, { symbol: TS.Symbol; optional: boolean; count: number }>()
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

function typeText(checker: TS.TypeChecker, symbol: TS.Symbol, d: TS.Declaration): string {
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
