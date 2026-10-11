import { globSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

// After `bun run build`: every React context must exist once in dist/, so an
// item and a host importing `@justanarthur/modo-ui/lib/*` share it.

const ROOT = join(import.meta.dirname, '..')
const read = (file: string) => readFileSync(join(ROOT, file), 'utf8')

const sources = globSync('{lib,primitives,components,blocks}/**/*.{ts,tsx}', { cwd: ROOT })
const contexts = sources.flatMap(file =>
  [...read(file).matchAll(/\b(?:const|let) (\w+) = createContext[<(]/g)].map(match => ({ file, name: match[1]! })),
)

const chunks = globSync('dist/**/*.js', { cwd: ROOT }).map(file => ({ file, code: read(file) }))
// Bun renames a clashing import to createContext2 and a clashing binding to Name2
const declared = (name: string) =>
  chunks.flatMap(({ file, code }) =>
    [...code.matchAll(new RegExp(`\\b(?:var|const|let) ${name}\\d* = createContext\\d*\\(`, 'g'))].map(() => file),
  )

const failures: string[] = []
for (const { file, name } of contexts) {
  const files = declared(name)
  if (files.length !== 1) failures.push(`${name} (${file}): ${files.length} declarations ${files.join(', ')}`)
}

const calls = chunks.reduce((sum, { code }) => sum + (code.match(/\bcreateContext\d*\(/g)?.length ?? 0), 0)
if (calls !== contexts.length) failures.push(`${calls} createContext calls in dist, ${contexts.length} in the sources`)

const SIZE = '@justanarthur/modo-ui/lib/size-context'
const BUTTON = '@justanarthur/modo-ui/components/button'
const { SizeContext, sizeMap } = await import(SIZE)
const { default: Button } = await import(BUTTON)

const button = createElement(Button, null, 'x')
const compact = createElement(
  SizeContext.Provider,
  { value: { size: 'compact', setSize: () => {}, classes: sizeMap.compact } },
  button,
)
// The button reads the provider only when both entries share one SizeContext.
// console.error muted: React warns about useLayoutEffect on the server.
const { error } = console
console.error = () => {}
const shared = renderToStaticMarkup(compact) !== renderToStaticMarkup(button)
console.error = error
if (!shared) failures.push(`${BUTTON} ignores the SizeContext from ${SIZE}`)

// Module state, not a context: the global toast() queue must be one instance too.
const managers = chunks.reduce((sum, { code }) => sum + (code.match(/\bcreateToastManager\d*\(/g)?.length ?? 0), 0)
if (managers !== 1) failures.push(`${managers} createToastManager calls in dist, expected 1`)
const BARREL = '@justanarthur/modo-ui'
const TOAST = '@justanarthur/modo-ui/components/overlays/toast'
const { toast: barrelToast } = await import(BARREL)
const { toast: entryToast } = await import(TOAST)
if (barrelToast !== entryToast) failures.push('toast differs between the barrel and ./components/overlays/toast')

console.log(`${contexts.length} contexts, ${calls} createContext calls in dist, one declaration each`)
console.log(`${SIZE} -> ${relative(ROOT, fileURLToPath(import.meta.resolve(SIZE)))}`)
console.log(`${BUTTON} -> ${relative(ROOT, fileURLToPath(import.meta.resolve(BUTTON)))}`)
console.log(`Button under a compact SizeContext.Provider renders compact: ${shared}`)
console.log(`toast(): ${managers} manager in dist, barrel === entry: ${barrelToast === entryToast}`)

if (failures.length) {
  console.error(failures.join('\n'))
  process.exit(1)
}
