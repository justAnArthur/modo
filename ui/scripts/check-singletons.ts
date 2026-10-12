import { existsSync, globSync, readFileSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

// After `bun run build`: every React context must exist once in dist/, so an
// item and a host importing `@justanarthur/modo-ui/lib/*` share it, and every
// token file must ship per group.

const ROOT = join(import.meta.dirname, '..')
const read = (file: string) => readFileSync(join(ROOT, file), 'utf8')

const sources = globSync('{lib,primitives,components,blocks,docs}/**/*.{ts,tsx}', { cwd: ROOT })
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

// bunup drops an entry's .d.ts without a word when the declarations import the
// root barrel back (a cycle), so every built entry must have its types beside it.
const untyped = chunks
  .map(({ file }) => file)
  .filter(file => !file.startsWith('dist/shared/') && !existsSync(join(ROOT, file.replace(/\.js$/, '.d.ts'))))
for (const file of untyped) failures.push(`${file} has no .d.ts beside it`)

// The .d.ts bundler renames a clashing import (`Menu` -> `Menu2`) and every
// same-named identifier in that module with it, static keys included, so
// `Dropdown.Menu` would be typed as `Dropdown.Menu2`. Alias the import instead.
const typings = globSync('dist/**/*.d.ts', { cwd: ROOT })
const renamed = typings.flatMap(file =>
  [...read(file).matchAll(/^\s+([A-Z][A-Za-z]+[0-9]+): typeof/gm)].map(match => `${file}: ${match[1]}`),
)
for (const hit of renamed) failures.push(`${hit} is a renamed static (alias the clashing import)`)

// Module state, not a context: the global toast() queue must be one instance too.
const managers = chunks.reduce((sum, { code }) => sum + (code.match(/\bcreateToastManager\d*\(/g)?.length ?? 0), 0)
if (managers !== 1) failures.push(`${managers} createToastManager calls in dist, expected 1`)
const BARREL = '@justanarthur/modo-ui'
const TOAST = '@justanarthur/modo-ui/components/overlays/toast'
const { toast: barrelToast } = await import(BARREL)
const { toast: entryToast } = await import(TOAST)
if (barrelToast !== entryToast) failures.push('toast differs between the barrel and ./components/overlays/toast')

// The docs chrome (`./docs`) is for a host's docs site: the barrel must not reach it,
// or every consumer's bundle would carry the slot adapters (and Sidebar with them).
const imports = (code: string) => [...code.matchAll(/(?:from|import)\s*"(\.[^"]+)"/g)].map(([, from]) => from!)
const reachable = new Set<string>()
const queue = ['dist/index.js']
for (let file = queue.pop(); file; file = queue.pop()) {
  if (reachable.has(file)) continue
  reachable.add(file)
  for (const from of imports(read(file))) queue.push(relative(ROOT, join(ROOT, dirname(file), from)))
}
const docsLeaks = [...reachable].filter(
  file => file.startsWith('dist/docs/') || /\bDocsNav\b|__uiTheme/.test(read(file)),
)
for (const file of docsLeaks) failures.push(`the barrel reaches the docs chrome through ${file}`)

const DOCS = '@justanarthur/modo-ui/docs'
const DOCS_VITE = '@justanarthur/modo-ui/docs/vite'
const docs = await import(DOCS)
const docsVite = await import(DOCS_VITE)
const slots = ['Button', 'Link', 'Icon', 'Select', 'DocsNav', 'ThemeSwitcher']
for (const name of slots) if (typeof docs[name] === 'undefined') failures.push(`${DOCS} does not export ${name}`)
if (typeof docsVite.docsTheme !== 'function') failures.push(`${DOCS_VITE} does not export docsTheme`)
if (!existsSync(join(ROOT, 'docs/chrome.css'))) failures.push('docs/chrome.css is missing (./docs/chrome.css)')

// Every tokens/<group>.css ships unchanged as dist/tokens/<group>.css (`./tokens/*`):
// a host's modo viewer reads them one by one to group its foundations pages.
const tokenFiles = globSync('tokens/*.css', { cwd: ROOT }).sort()
for (const file of tokenFiles) {
  const shipped = join('dist', file)
  if (!existsSync(join(ROOT, shipped))) failures.push(`${shipped} is missing (tokens/*.css must ship per group)`)
  else if (read(shipped) !== read(file)) failures.push(`${shipped} differs from ${file}`)
}

console.log(`${contexts.length} contexts, ${calls} createContext calls in dist, one declaration each`)
console.log(`${SIZE} -> ${relative(ROOT, fileURLToPath(import.meta.resolve(SIZE)))}`)
console.log(`${BUTTON} -> ${relative(ROOT, fileURLToPath(import.meta.resolve(BUTTON)))}`)
console.log(`Button under a compact SizeContext.Provider renders compact: ${shared}`)
console.log(`toast(): ${managers} manager in dist, barrel === entry: ${barrelToast === entryToast}`)
console.log(`barrel reaches ${reachable.size} files, none of the docs chrome: ${docsLeaks.length === 0}`)
console.log(`${DOCS}: ${slots.join(', ')}; ${DOCS_VITE}: docsTheme`)
console.log(`.d.ts beside every entry: ${untyped.length === 0}`)
console.log(`dist/tokens/: ${tokenFiles.map(file => file.slice('tokens/'.length)).join(', ')}`)
console.log(`statics renamed by the .d.ts bundler: ${renamed.length}`)

if (failures.length) {
  console.error(failures.join('\n'))
  process.exit(1)
}
