#!/usr/bin/env bun
/*
 * UnoCSS coverage: every class string in the sources must generate CSS, and
 * UnoCSS's extractor must find it in the file it lives in (that is how the
 * dev server's filesystem scan sees it).
 *
 *   bun .scripts/uno-coverage.ts [path-prefix ...]
 *
 * Prefixes are relative to this package (`lib`, `components/select`);
 * with none, `lib primitives components modo.components.tsx` are scanned.
 * Class strings are pulled with the TypeScript AST from:
 *   - `className` / `class` / `*ClassName` JSX attributes and properties
 *   - `cn` / `cva` / `clsx` / `twMerge` / `twJoin` calls (cva's variant values
 *     and compoundVariants `class`; clsx-style object keys)
 *   - values of variables and properties named `*Class`, `*Classes`,
 *     `*Variants`, `SURFACE_*` and `*Map`
 *   - the code fences of `@example` blocks and the JSX blocks of
 *     examples.mdx, parsed as TSX with the same rules
 * Tokens next to a `${}` interpolation are partial and skipped. Classes that
 * global.css defines (`.scroll-fade`, `.shimmer-text`, …), `group`/`peer`
 * markers and `is-*` state markers are not utilities and are allowed.
 *
 * Built-in assertions pin the UnoCSS behaviours the Tailwind → UnoCSS port
 * relies on. Exit code 1 on any unmatched token, extraction miss or failed
 * assertion.
 */

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import ts from 'typescript'
import { createGenerator } from 'unocss'
import config from '../uno.config'
import { mdxBlocks } from './mdx-blocks'

const ROOT = resolve(import.meta.dirname, '..')
const DEFAULT_PREFIXES = ['lib', 'primitives', 'components', 'modo.components.tsx']

const CLASS_FNS = new Set(['cn', 'cva', 'clsx', 'twMerge', 'twJoin'])
const CLASS_ATTR = /^(className|class)$|ClassName$/
const CLASS_NAME = /(Class|Classes|ClassName)$|Variants$|^SURFACE_|Map$/
// Object keys whose string values are option names, not classes (shapeMap's
// `variant: "pill"`, cva compound selectors, …).
const NON_CLASS_KEYS = new Set(['variant', 'type', 'kind', 'name', 'id', 'label', 'side', 'align'])
// `group`/`peer` markers, and `is-*` state classes that pair with
// `group-[.is-*]/name:` variants (Table's row `is-active`).
const MARKER = /^(group|peer)(\/[\w-]+)?$|^is-[a-z]+(-[a-z]+)*$/

interface Hit {
  token: string
  file: string
  line: number
}

// ── Sources ──────────────────────────────────────────────────────────────

function walk(dir: string, out: string[]): void {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry.startsWith('.')) continue
    const p = join(dir, entry)
    if (statSync(p).isDirectory()) walk(p, out)
    else if (/\.(ts|tsx|mdx)$/.test(entry) && !entry.endsWith('.d.ts')) out.push(p)
  }
}

function sourceFiles(prefixes: string[]): string[] {
  const files: string[] = []
  for (const prefix of prefixes) {
    const abs = resolve(ROOT, prefix)
    if (!existsSync(abs)) continue
    if (statSync(abs).isDirectory()) walk(abs, files)
    else files.push(abs)
  }
  return [...new Set(files)].sort()
}

function globalCssClasses(): Set<string> {
  const css = readFileSync(join(ROOT, 'global.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
  return new Set([...css.matchAll(/\.([a-zA-Z_][\w-]*)/g)].map((m) => m[1]!))
}

// ── Class-string collection ──────────────────────────────────────────────

function propName(name: ts.PropertyName | ts.JsxAttributeName): string | undefined {
  if (ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isPrivateIdentifier(name)) return name.text
  return undefined
}

function tokens(text: string, trimStart: boolean, trimEnd: boolean): string[] {
  const parts = text.split(/\s+/)
  // A token glued to an interpolation (`bg-surface-${n}`) is partial.
  if (trimStart && !/^\s/.test(text)) parts.shift()
  if (trimEnd && !/\s$/.test(text)) parts.pop()
  return parts.filter(Boolean)
}

function collect(sf: ts.SourceFile, file: string, lineOffset: number, hits: Hit[]): void {
  const lineOf = (node: ts.Node) => sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1 + lineOffset
  const add = (node: ts.Node, list: string[]) => {
    for (const token of list) hits.push({ token, file, line: lineOf(node) })
  }

  // Everything below a class context that can produce a class string.
  function classValue(node: ts.Node): void {
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      add(node, tokens(node.text, false, false))
      return
    }
    if (ts.isTemplateExpression(node)) {
      add(node.head, tokens(node.head.text, false, true))
      node.templateSpans.forEach((span, i) => {
        const last = i === node.templateSpans.length - 1
        add(span.literal, tokens(span.literal.text, true, !last))
        visit(span.expression)
      })
      return
    }
    if (ts.isBinaryExpression(node)) {
      const op = node.operatorToken.kind
      // `size === "sm" && "…"`: comparison operands are values, not classes.
      if (
        op === ts.SyntaxKind.EqualsEqualsEqualsToken ||
        op === ts.SyntaxKind.ExclamationEqualsEqualsToken ||
        op === ts.SyntaxKind.EqualsEqualsToken ||
        op === ts.SyntaxKind.ExclamationEqualsToken
      ) {
        visit(node)
        return
      }
      classValue(node.left)
      classValue(node.right)
      return
    }
    if (ts.isConditionalExpression(node)) {
      visit(node.condition)
      classValue(node.whenTrue)
      classValue(node.whenFalse)
      return
    }
    if (ts.isParenthesizedExpression(node) || ts.isAsExpression(node) || ts.isSatisfiesExpression(node)) {
      classValue(node.expression)
      return
    }
    if (ts.isJsxExpression(node)) {
      if (node.expression) classValue(node.expression)
      return
    }
    if (ts.isArrayLiteralExpression(node)) {
      node.elements.forEach(classValue)
      return
    }
    if (ts.isObjectLiteralExpression(node)) {
      for (const prop of node.properties) {
        if (!ts.isPropertyAssignment(prop)) {
          visit(prop)
          continue
        }
        const key = propName(prop.name)
        if (key && NON_CLASS_KEYS.has(key)) continue
        classValue(prop.initializer)
      }
      return
    }
    if (ts.isArrowFunction(node) || ts.isFunctionExpression(node)) {
      if (ts.isBlock(node.body)) {
        const returns = (n: ts.Node): void => {
          if (ts.isReturnStatement(n) && n.expression) classValue(n.expression)
          else if (!ts.isFunctionLike(n)) ts.forEachChild(n, returns)
        }
        returns(node.body)
      } else classValue(node.body)
      return
    }
    visit(node)
  }

  // clsx semantics: strings, arrays, and object KEYS are classes.
  function clsxArg(node: ts.Node): void {
    if (ts.isObjectLiteralExpression(node)) {
      for (const prop of node.properties) {
        if (ts.isPropertyAssignment(prop) || ts.isShorthandPropertyAssignment(prop)) {
          const key = propName(prop.name)
          if (key) add(prop.name, tokens(key, false, false))
          if (ts.isPropertyAssignment(prop)) visit(prop.initializer)
        }
      }
      return
    }
    if (ts.isArrayLiteralExpression(node)) {
      node.elements.forEach(clsxArg)
      return
    }
    classValue(node)
  }

  function cvaCall(call: ts.CallExpression): void {
    const [base, options] = call.arguments
    if (base) classValue(base)
    if (!options || !ts.isObjectLiteralExpression(options)) return
    for (const prop of options.properties) {
      if (!ts.isPropertyAssignment(prop)) continue
      const key = propName(prop.name)
      if (key === 'variants' && ts.isObjectLiteralExpression(prop.initializer)) {
        for (const variant of prop.initializer.properties) {
          if (!ts.isPropertyAssignment(variant) || !ts.isObjectLiteralExpression(variant.initializer)) continue
          for (const option of variant.initializer.properties) {
            if (ts.isPropertyAssignment(option)) classValue(option.initializer)
          }
        }
      } else if (key === 'compoundVariants' && ts.isArrayLiteralExpression(prop.initializer)) {
        for (const entry of prop.initializer.elements) {
          if (!ts.isObjectLiteralExpression(entry)) continue
          for (const p of entry.properties) {
            if (ts.isPropertyAssignment(p) && /^(class|className)$/.test(propName(p.name) ?? '')) {
              classValue(p.initializer)
            }
          }
        }
      }
    }
  }

  function visit(node: ts.Node): void {
    if (ts.isJsxAttribute(node)) {
      const name = propName(node.name)
      if (name && CLASS_ATTR.test(name) && node.initializer) {
        classValue(node.initializer)
        return
      }
    }
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && CLASS_FNS.has(node.expression.text)) {
      if (node.expression.text === 'cva') cvaCall(node)
      else node.arguments.forEach(clsxArg)
      return
    }
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer && CLASS_NAME.test(node.name.text)) {
      classValue(node.initializer)
      return
    }
    if (ts.isPropertyAssignment(node)) {
      const name = propName(node.name)
      if (name && (CLASS_ATTR.test(name) || CLASS_NAME.test(name))) {
        classValue(node.initializer)
        return
      }
    }
    ts.forEachChild(node, visit)
  }

  visit(sf)
}

// `@example` fences inside JSDoc blocks, parsed as TSX.
function collectExamples(text: string, file: string, hits: Hit[]): void {
  for (const block of text.matchAll(/\/\*\*[\s\S]*?\*\//g)) {
    const blockLine = text.slice(0, block.index).split('\n').length
    const lines = block[0].split('\n').map((l) => l.replace(/^\s*\*? ?/, ''))
    for (let i = 0; i < lines.length; i++) {
      if (!/^```/.test(lines[i]!)) continue
      const start = i + 1
      let end = start
      while (end < lines.length && !/^```/.test(lines[end]!)) end++
      let code = lines.slice(start, end).join('\n')
      i = end
      code = code.replace(/^\s*import\s[^\n]*\n/gm, '').trim().replace(/;+$/, '')
      const wrapped = code.startsWith('<') ? `<>\n${code}\n</>` : `(\n${code}\n)`
      const sf = ts.createSourceFile('example.tsx', `const __example = ${wrapped}`, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
      // Line 1 of the snippet is the wrapper; the fence body starts after it.
      collect(sf, file, blockLine + start - 2, hits)
    }
  }
}

// The JSX blocks of an examples.mdx, parsed as TSX.
function collectMdx(text: string, file: string, hits: Hit[]): void {
  for (const { code, line } of mdxBlocks(text)) {
    const sf = ts.createSourceFile('example.tsx', `const __example = <>\n${code}\n</>`, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
    collect(sf, file, line - 2, hits)
  }
}

// ── Built-in assertions ──────────────────────────────────────────────────

const ASSERTIONS: Array<[token: string, expect: string[]]> = [
  ['bg-accent/12', ['color-mix(in srgb, var(--accent) 12%, transparent)']],
  ['shadow-surface-3', ['--un-shadow:var(--shadow-3)']],
  ['bg-surface-5', ['var(--surface-5)']],
  ['dark:bg-surface-2', ['.dark .dark\\:bg-surface-2']],
  ['group-[.is-active]/row:opacity-100', ['.group\\/row.is-active .group-']],
  ['has-data-[state=open]:bg-hover', [':has(*[data-state=open])']],
  ['[[data-side=top]_&]:origin-bottom', ['[data-side=top] .\\[\\[data-side']],
  ['[&>div[style]]:!block', ['>div[style]{display:block !important;}']],
  ['supports-[backdrop-filter]:bg-background/60', ['@supports (backdrop-filter']],
  ['[text-box:trim-both_cap_alphabetic]', ['text-box:trim-both cap alphabetic;']],
  ['ring-[color:var(--focus-ring)]', ['--un-ring-color:', 'var(--focus-ring)']],
  ['duration-80', ['transition-duration:80ms;']],
  ['transition-[color,stroke-width]', ['transition-property:color,stroke-width;']],
  ['transition-[font-variation-settings]', ['transition-property:font-variation-settings;']],
  ['text-body', ['font-size:var(--text-body);']],
  ['text-display', ['font-size:var(--text-display);']],
  ['text-[13px]', ['font-size:13px;']],
  ['font-sans', ['font-family:var(--font-sans);']],
  ['rounded-lg', ['border-radius:var(--radius-lg);']],
  ['[--popup-enter-y:-4px]', ['--popup-enter-y:-4px;']],
  ['!h-auto', ['height:auto !important;']],
]

// ── Main ─────────────────────────────────────────────────────────────────

const uno = await createGenerator(config)
const failures: string[] = []

for (const [token, expects] of ASSERTIONS) {
  const { css } = await uno.generate(new Set([token]), { preflights: false })
  for (const e of expects) {
    if (!css.includes(e)) failures.push(`assertion: \`${token}\` → expected CSS to contain ${JSON.stringify(e)}`)
  }
}
{
  // wind4's default radius scale is kept (shape-context pairs rounded-lg with 8px).
  const { css } = await uno.generate(new Set(['rounded-lg']), { preflights: true })
  if (!css.includes('--radius-lg: 0.5rem')) failures.push('assertion: theme `--radius-lg` must stay 0.5rem (8px)')
}

const prefixes = process.argv.slice(2)
const files = sourceFiles(prefixes.length > 0 ? prefixes : DEFAULT_PREFIXES)
const allowed = globalCssClasses()
const cache = new Map<string, boolean>()
let tokenCount = 0

for (const file of files) {
  const text = readFileSync(file, 'utf8')
  const rel = relative(ROOT, file).startsWith('..') ? file : relative(ROOT, file)
  const hits: Hit[] = []
  if (file.endsWith('.mdx')) collectMdx(text, rel, hits)
  else {
    const kind = file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS
    collect(ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, kind), rel, 0, hits)
    collectExamples(text, rel, hits)
  }
  if (hits.length === 0) continue
  const extracted = await uno.applyExtractors(text, file)
  for (const { token, line } of hits) {
    if (MARKER.test(token) || allowed.has(token)) continue
    tokenCount++
    let ok = cache.get(token)
    if (ok === undefined) {
      const { matched } = await uno.generate(new Set([token]), { preflights: false })
      ok = matched.size > 0
      cache.set(token, ok)
    }
    if (!ok) failures.push(`${rel}:${line}  unmatched \`${token}\``)
    else if (!extracted.has(token)) failures.push(`${rel}:${line}  not extracted \`${token}\``)
  }
}

const scope = prefixes.length > 0 ? prefixes.join(' ') : DEFAULT_PREFIXES.join(' ')
if (failures.length > 0) {
  process.stderr.write(`uno-coverage (${scope}): ${failures.length} problem(s)\n${failures.map((f) => '  ' + f).join('\n')}\n`)
  process.exit(1)
}
process.stdout.write(
  `uno-coverage (${scope}): ${files.length} files, ${tokenCount} class tokens (${cache.size} unique), ${ASSERTIONS.length + 1} assertions — all generate\n`,
)
