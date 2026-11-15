import { createElement, Fragment, type ReactElement } from 'react'

/** Identifiers an example may reference: item components + `examples` exports. */
export type ExampleScope = Record<string, unknown>

export type ExampleRenderer = ((scope: ExampleScope) => ReactElement | null) & {
  /** Identifiers in the compiled code (a superset of what it reads from scope). */
  identifiers: string[]
}

const cache = new Map<string, ExampleRenderer | string>()

type Babel = typeof import('@babel/standalone')
let babel: Babel | null = null
let loading: Promise<Babel> | null = null

/** Babel standalone is about 3 MB, so it loads only once a page shows an inline `@example`. */
export function loadBabel(): Promise<Babel> {
  loading ??= import('@babel/standalone').then(m => {
    babel = m
    return m
  })
  return loading
}

export function babelReady(): boolean {
  return babel !== null
}

const REACT_STUB = { createElement, Fragment }
const RESERVED = new Set(['React', 'default', '__scope'])

// Leading `import … from '…'` / `import '…'` statements (single- or
// multi-line): examples may show them for copy-paste, the scope provides the
// bindings.
const LEADING_IMPORT = /^\s*import\s+(?:[\s\S]*?\s+from\s+)?['"][^'"\n]+['"][ \t]*;?[ \t]*(?:\n|$)/

function stripImports(code: string): string {
  let rest = code
  for (let m = rest.match(LEADING_IMPORT); m; m = rest.match(LEADING_IMPORT)) rest = rest.slice(m[0].length)
  return rest.trim().replace(/;+$/, '').trimEnd()
}

/**
 * Compiles an `@example` body (one JSX expression, or several sibling
 * elements) into a renderer. The body runs as `return (<>…</>)` inside
 * `new Function('React', '__scope', …)` with a `var` declaration for each
 * identifier in the code that is an own key of the scope — nothing is written
 * to globals and unrelated globals (Map, Set, Math…) are never shadowed.
 * Returns the source string when it doesn't compile. Call `loadBabel()` first.
 */
export function compileExampleBody(code: string): ExampleRenderer | string {
  const cached = cache.get(code)
  if (cached !== undefined) return cached
  if (!babel) throw new Error('[modo] compileExampleBody before loadBabel()')

  let js: string
  try {
    const body = stripImports(code)
    // Sibling elements need a fragment, on one line or several; only wrap
    // JSX (a JS expression would otherwise turn into text children).
    const wrapped = body.startsWith('<') ? `<>${body}</>` : body
    const out = babel.transform(`return (${wrapped});`, {
      presets: ['typescript', 'react'],
      filename: 'example.tsx',
      parserOpts: { allowReturnOutsideFunction: true },
    })
    js = (out.code ?? '').replace(/['"]use strict['"];?/, '')
  } catch (err) {
    console.error('[modo] example failed to compile:', (err as Error).message, `\n${code}`)
    cache.set(code, code)
    return code
  }

  // Identifier tokens, minus member names (`Select.Item` → `Select`).
  const identifiers = [...new Set(js.match(/(?<![\w$])(?<![^.]\.)[A-Za-z_$][\w$]*/g) ?? [])]
  const fns = new WeakMap<object, (react: typeof REACT_STUB, scope: ExampleScope) => unknown>()

  const renderer = ((scope: ExampleScope) => {
    try {
      let fn = fns.get(scope)
      if (!fn) {
        const decls = identifiers
          .filter(n => !RESERVED.has(n) && Object.hasOwn(scope, n))
          .map(n => `var ${n} = __scope[${JSON.stringify(n)}];`)
          .join('\n')
        fn = new Function('React', '__scope', `${decls}\n${js}`) as (
          react: typeof REACT_STUB,
          scope: ExampleScope,
        ) => unknown
        fns.set(scope, fn)
      }
      return (fn(REACT_STUB, scope) as ReactElement | null) ?? null
    } catch (err) {
      console.error('[modo] example failed:', err, `\n${code}`)
      return null
    }
  }) as ExampleRenderer
  renderer.identifiers = identifiers

  cache.set(code, renderer)
  return renderer
}

export function isCompiledExample(value: unknown): value is ExampleRenderer {
  return typeof value === 'function'
}
