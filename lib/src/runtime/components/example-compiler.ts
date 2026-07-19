// server-only example compiler. turns a TSDoc example's `code` string
// (JSX) into the body of a function that, given a Component, returns
// a React element.
//
// the body is a plain string, not a function — so it's serializable
// (can be sent to the browser in a virtual module and re-instantiated
// with `new Function(...)`). this is how we keep esbuild out of the
// client bundle: this file is only imported from server-side code
// (the source plugin's load function), never from the universal
// example-renderer.

import * as esbuild from 'esbuild'

const cache = new Map<string, string>()

// we key the cache by the example's code (not the full example object)
// so the same code reused across items shares a compile. the returned
// body is just a function body, no closures over Component.
export function compileExampleBody(code: string, componentName: string): string {
  const cached = cache.get(code)
  if (cached) return cached

  // wrap the user's JSX in a render() function we can call with a
  // Component arg. we bind the Component to the component's actual
  // name so the example's JSX (`<Button>`, `<Badge>`, ...) can
  // reference it as a free variable. the binding happens in the
  // wrapper so esbuild doesn't rewrite the identifier.
  const safeName = /^[A-Za-z_$][\w$]*$/.test(componentName) ? componentName : 'Component'
  const wrapped = `
import * as React from 'react'
export default function render(Component) {
  const ${safeName} = Component
  return (${code})
}
`
  const result = esbuild.buildSync({
    stdin: { contents: wrapped, loader: 'tsx', resolveDir: process.cwd() },
    bundle: true,
    write: false,
    format: 'esm',
    platform: 'neutral',
    jsx: 'transform',
    target: 'es2020',
    external: ['react', 'react-dom', 'modo-atomic-ui'],
    logLevel: 'silent',
  })
  const out = result.outputFiles?.[0]?.text ?? ''
  if (!out) throw new Error('esbuild produced no output for example code')

  // strip esbuild's import + export wrappers (we pass React in as a
  // parameter; render() is called directly). the `export { render as
  // default }` line can wrap multiple lines so use a non-greedy match.
  const body = out
    .replace(/^\s*import\s+[\s\S]*?;[\t ]*$/gm, '')
    .replace(/export\s*\{[\s\S]*?\}\s*;?/g, '')
    .replace(/export\s+default\s+/g, '')
    .trim()

  cache.set(code, body)
  return body
}

// HMR: clear the compile cache when this module is invalidated. any
// re-render of ExampleBlock will pull the latest source via the
// virtual:modo-items.examples map (the source plugin re-runs on
// file change and re-compiles).
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    cache.clear()
  })
}
