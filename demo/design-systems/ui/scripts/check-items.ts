#!/usr/bin/env bun
/*
 * Item contract check — what modo needs from every `<tier>/<id>/index.tsx`.
 *
 *   bun scripts/check-items.ts [path-prefix ...]
 *
 * Prefixes are relative to this package (`components/select`, `primitives`);
 * with none, every item is checked. Names are always collected from ALL items
 * so uniqueness holds package-wide. Per item:
 *   - modo's own parser (`parseItemSource`, lib/src/lib/tsdoc.ts) reports no
 *     errors, finds ≥1 `@example`, and every prop has a description;
 *   - the item name is unique among items and not an `examples.ts` export;
 *   - every example compiles with modo's compiler (`compileExampleBody`,
 *     lib/src/lib/example.ts — Babel, as in the browser), every free
 *     identifier resolves (item names, examples.ts exports, JS/DOM globals,
 *     or bindings the example declares itself), and every `Item.Part` static
 *     it uses is attached to that item (`Object.assign(Item, { Part })` or
 *     `Item.Part = …`);
 *   - the item bundles with esbuild the way modo bundles it.
 * Exit code 1 on any problem.
 */

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import esbuild from 'esbuild'
import ts from 'typescript'

const ROOT = resolve(import.meta.dirname, '..')
const LIB = resolve(ROOT, '../../../lib/src/lib')
const TIERS = ['primitives', 'components', 'blocks'] as const

// modo's parser + example compiler, loaded by path (not a package export).
// Typed locally so a concurrent lib change can't break this package's tsc.
interface ParsedItem {
  name: string
  description: string
  props: Array<{ name: string; description?: string }>
  examples: Array<{ title?: string; code: string }>
  errors: string[]
}
const tsdocPath = join(LIB, 'tsdoc.ts')
const examplePath = join(LIB, 'example.ts')
const { parseItemSource } = (await import(tsdocPath)) as { parseItemSource: (src: string) => ParsedItem }
const { compileExampleBody } = (await import(examplePath)) as { compileExampleBody?: (code: string) => unknown }

// ── Discovery ────────────────────────────────────────────────────────────

interface Item {
  tier: string
  id: string
  file: string
  rel: string
  source: string
  parsed: ParsedItem
  name: string
}

const items: Item[] = []
for (const tier of TIERS) {
  const dir = join(ROOT, tier)
  if (!existsSync(dir)) continue
  for (const id of readdirSync(dir).sort()) {
    const file = join(dir, id, 'index.tsx')
    if (!statSync(join(dir, id)).isDirectory() || !existsSync(file)) continue
    const source = readFileSync(file, 'utf8')
    const parsed = parseItemSource(source)
    items.push({ tier, id, file, rel: relative(ROOT, file), source, parsed, name: parsed.name || id })
  }
}

const prefixes = process.argv.slice(2).map((p) => p.replace(/\/+$/, ''))
const selected = prefixes.length === 0 ? items : items.filter((it) => prefixes.some((p) => `${it.tier}/${it.id}/`.startsWith(`${p}/`) || it.rel.startsWith(p)))

const scopePath = join(ROOT, 'examples.ts')
const scopeNames = new Set(existsSync(scopePath) ? Object.keys(await import(scopePath)).filter((k) => k !== 'default') : [])
const itemByName = new Map<string, Item[]>()
for (const it of items) itemByName.set(it.name, [...(itemByName.get(it.name) ?? []), it])

const GLOBALS = new Set([
  ...Object.getOwnPropertyNames(globalThis),
  'undefined', 'NaN', 'Infinity', 'React',
  'window', 'document', 'navigator', 'location', 'history', 'localStorage', 'sessionStorage',
  'alert', 'confirm', 'prompt', 'requestAnimationFrame', 'cancelAnimationFrame', 'matchMedia',
  'HTMLElement', 'HTMLInputElement', 'HTMLDivElement', 'HTMLButtonElement', 'Element', 'Node', 'Event',
  'KeyboardEvent', 'MouseEvent', 'PointerEvent', 'File', 'FileList', 'Blob', 'Image', 'DOMRect',
])

// ── Statics attached to an item's root ───────────────────────────────────

function staticsOf(item: Item): Set<string> {
  const out = new Set<string>()
  const sf = ts.createSourceFile(item.file, item.source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  const isRoot = (e: ts.Expression) => ts.isIdentifier(e) && e.text === item.name
  const visit = (node: ts.Node): void => {
    // Object.assign(Root, { A, B: C, ... })
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      node.expression.getText(sf) === 'Object.assign' &&
      node.arguments[0] &&
      isRoot(node.arguments[0])
    ) {
      for (const arg of node.arguments.slice(1)) {
        if (!ts.isObjectLiteralExpression(arg)) continue
        for (const p of arg.properties) {
          if ((ts.isPropertyAssignment(p) || ts.isShorthandPropertyAssignment(p) || ts.isMethodDeclaration(p)) && ts.isIdentifier(p.name)) {
            out.add(p.name.text)
          }
        }
      }
    }
    // Root.A = …
    if (
      ts.isBinaryExpression(node) &&
      node.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
      ts.isPropertyAccessExpression(node.left) &&
      isRoot(node.left.expression)
    ) {
      out.add(node.left.name.text)
    }
    ts.forEachChild(node, visit)
  }
  visit(sf)
  return out
}

// ── Example analysis ─────────────────────────────────────────────────────

const LEADING_IMPORT = /^\s*import\s+(?:[\s\S]*?\s+from\s+)?['"][^'"\n]+['"][ \t]*;?[ \t]*(?:\n|$)/

function exampleBody(code: string): string {
  let rest = code
  for (let m = rest.match(LEADING_IMPORT); m; m = rest.match(LEADING_IMPORT)) rest = rest.slice(m[0].length)
  const body = rest.trim().replace(/;+$/, '').trimEnd()
  return /\n/.test(body) && body.startsWith('<') ? `<>${body}</>` : body
}

interface Refs {
  free: Set<string>
  statics: Array<[root: string, part: string]>
  syntax: string[]
}

function analyze(code: string): Refs {
  const src = `const __example = (${exampleBody(code)});`
  const sf = ts.createSourceFile('example.tsx', src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  const diagnostics = (sf as unknown as { parseDiagnostics?: ts.Diagnostic[] }).parseDiagnostics ?? []
  const declared = new Set<string>(['__example'])
  const used = new Set<string>()
  const statics: Array<[string, string]> = []

  const bind = (name: ts.BindingName): void => {
    if (ts.isIdentifier(name)) declared.add(name.text)
    else for (const el of name.elements) if (!ts.isOmittedExpression(el)) bind(el.name)
  }
  const tag = (t: ts.JsxTagNameExpression): void => {
    if (ts.isIdentifier(t)) {
      if (/^[A-Z]/.test(t.text)) used.add(t.text)
    } else if (ts.isPropertyAccessExpression(t)) {
      let root: ts.Expression = t
      while (ts.isPropertyAccessExpression(root)) root = root.expression
      if (ts.isIdentifier(root)) {
        used.add(root.text)
        if (ts.isIdentifier(t.expression)) statics.push([t.expression.text, t.name.text])
      }
    }
  }
  const visit = (node: ts.Node): void => {
    if (ts.isVariableDeclaration(node) || ts.isParameter(node) || ts.isBindingElement(node)) bind(node.name)
    if ((ts.isFunctionDeclaration(node) || ts.isFunctionExpression(node)) && node.name) declared.add(node.name.text)
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      tag(node.tagName)
      if (node.typeArguments) node.typeArguments.forEach(visit)
      visit(node.attributes)
      return
    }
    if (ts.isJsxClosingElement(node)) return
    if (ts.isJsxAttribute(node)) {
      if (node.initializer) visit(node.initializer)
      return
    }
    if (ts.isPropertyAccessExpression(node)) {
      if (ts.isIdentifier(node.expression) && itemByName.has(node.expression.text)) {
        statics.push([node.expression.text, node.name.text])
      }
      visit(node.expression)
      return
    }
    if (ts.isPropertyAssignment(node)) {
      if (ts.isComputedPropertyName(node.name)) visit(node.name)
      visit(node.initializer)
      return
    }
    if (ts.isTypeNode(node)) return
    if (ts.isIdentifier(node)) {
      used.add(node.text)
      return
    }
    ts.forEachChild(node, visit)
  }
  visit(sf)

  const free = new Set([...used].filter((n) => !declared.has(n)))
  return {
    free,
    statics,
    syntax: diagnostics.map((d) => ts.flattenDiagnosticMessageText(d.messageText, '\n')),
  }
}

// ── Checks ───────────────────────────────────────────────────────────────

const problems: string[] = []
const report = (it: Item, msg: string) => problems.push(`${it.tier}/${it.id}: ${msg}`)
const staticsCache = new Map<string, Set<string>>()
const staticsFor = (name: string) => {
  const it = itemByName.get(name)?.[0]
  if (!it) return new Set<string>()
  if (!staticsCache.has(name)) staticsCache.set(name, staticsOf(it))
  return staticsCache.get(name)!
}

let exampleCount = 0
for (const it of selected) {
  const { parsed } = it
  for (const e of parsed.errors) report(it, `parser: ${e}`)
  if (!parsed.name) report(it, 'parser found no default-exported component name')
  if (parsed.examples.length === 0) report(it, 'no @example')
  for (const p of parsed.props) {
    if (!p.description?.trim()) report(it, `prop \`${p.name}\` has no description`)
  }
  if ((itemByName.get(it.name)?.length ?? 0) > 1) {
    report(it, `name \`${it.name}\` is also used by ${itemByName.get(it.name)!.filter((o) => o !== it).map((o) => `${o.tier}/${o.id}`).join(', ')}`)
  }
  if (scopeNames.has(it.name)) report(it, `name \`${it.name}\` collides with an examples.ts export`)

  parsed.examples.forEach((ex, i) => {
    exampleCount++
    const label = `example ${i + 1}${ex.title ? ` "${ex.title}"` : ''}`
    if (compileExampleBody) {
      const compiled = compileExampleBody(ex.code)
      if (typeof compiled !== 'function') report(it, `${label}: does not compile (modo's Babel compiler)`)
    }
    const refs = analyze(ex.code)
    for (const s of refs.syntax) report(it, `${label}: ${s}`)
    for (const id of refs.free) {
      if (itemByName.has(id) || scopeNames.has(id) || GLOBALS.has(id)) continue
      report(it, `${label}: unresolved identifier \`${id}\``)
    }
    for (const [root, part] of refs.statics) {
      if (!itemByName.has(root)) continue
      if (!staticsFor(root).has(part)) report(it, `${label}: \`${root}.${part}\` is not a static of ${root}`)
    }
  })

  const built = await esbuild
    .build({
      entryPoints: [it.file],
      bundle: true,
      write: false,
      format: 'esm',
      platform: 'browser',
      target: 'es2022',
      external: ['react', 'react-dom', 'react/jsx-runtime', 'react/jsx-dev-runtime'],
      loader: { '.ts': 'ts', '.tsx': 'tsx', '.css': 'empty', '.svg': 'dataurl' },
      jsx: 'automatic',
      jsxImportSource: 'react',
      logLevel: 'silent',
    })
    .then(() => null)
    .catch((err: { errors?: esbuild.Message[] }) => err.errors ?? [{ text: String(err) } as esbuild.Message])
  for (const e of built ?? []) report(it, `esbuild: ${e.text}${e.location ? ` (${e.location.file}:${e.location.line})` : ''}`)
}

const scopeLabel = prefixes.length > 0 ? prefixes.join(' ') : 'all items'
if (!compileExampleBody) problems.push(`lib: compileExampleBody not found in ${examplePath}`)
if (problems.length > 0) {
  process.stderr.write(`check-items (${scopeLabel}): ${problems.length} problem(s)\n${problems.map((p) => '  ' + p).join('\n')}\n`)
  process.exit(1)
}
process.stdout.write(`check-items (${scopeLabel}): ${selected.length} item(s), ${exampleCount} example(s) — ok\n`)
