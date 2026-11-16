import { spawnSync } from 'node:child_process'
import { globSync, readFileSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

// After `bun run build`: the package's shape for 1.0.
// - "use client" marks exactly the client chunks, and the server-safe
//   subpaths reach no client chunk, so a Server Component can call them.
// - Each React context is created once in dist/: the barrel, the items and
//   the `./lib/*` subpaths share it.
// - Every `exports` entry ships its JS and its .d.ts, and loads in Node.

const ROOT = join(import.meta.dirname, '..')
const PACKAGE = '@justanarthur/modo-ui'
const DIRECTIVE = '"use client";\n'
const SERVER_SAFE = ['./lib/utils', './lib/springs', './lib/size-scale', './lib/shape-classes', './lib/field-classes']

const read = (file: string) => readFileSync(join(ROOT, file), 'utf8')
const failures: string[] = []

interface Chunk {
  client: boolean
  // relative chunks it takes bindings from (side-effect imports only order evaluation)
  bindings: string[]
  // code of its own, beyond imports and re-exports
  own: string
}

const IMPORT = /^import\s*(\{[^}]*\}|\*\s*as\s+\w+|\w+)?\s*(?:from\s*)?"([^"]+)";?$/gm
const EXPORT = /^export\s*\{[^}]*\}(?:\s*from\s*"[^"]+")?;?$/gm
const COMMENT = /^\s*\/\/.*$/gm

// preset.js runs in the host's Node config, never in a React tree
const files = globSync('dist/**/*.js', { cwd: ROOT }).filter(file => file !== 'dist/preset.js')
const chunks = new Map<string, Chunk>(
  files.map(file => {
    const code = read(file)
    const bindings = [...code.matchAll(IMPORT)]
      .filter(([, names, from]) => names && from!.startsWith('.'))
      .map(([, , from]) => relative(ROOT, join(ROOT, dirname(file), from!)))
    const own = code.replace(IMPORT, '').replace(EXPORT, '').replace(COMMENT, '').trim()
    return [file, { client: code.startsWith(DIRECTIVE), bindings, own }]
  }),
)

for (const [file, { client, bindings, own }] of chunks) {
  if (client || !own) continue
  if (/\b(?:use[A-Z]\w*|createContext)\d*\(/.test(own))
    failures.push(`${file} calls a hook or creates a context without "use client"`)
  for (const dep of bindings)
    if (chunks.get(dep)?.client) failures.push(`${file} has no "use client" but takes a binding from the client ${dep}`)
}

const pkg = JSON.parse(read('package.json'))
const variants = globSync('components/**/variants.ts', { cwd: ROOT }).map(
  file => `./${file.replace(/\/variants\.ts$/, '/variants')}`,
)
for (const subpath of [...SERVER_SAFE, ...variants]) {
  const entry = target(subpath)
  const seen = new Set<string>()
  const queue = [entry]
  for (let file = queue.pop(); file; file = queue.pop()) {
    if (seen.has(file)) continue
    seen.add(file)
    const chunk = chunks.get(file)
    if (!chunk) {
      failures.push(`${subpath}: ${file} is missing`)
      continue
    }
    if (chunk.client) failures.push(`${subpath} reaches the client chunk ${file}`)
    queue.push(...chunk.bindings)
  }
}

// Bun renames a clashing binding to Name2, a clashing import to createContext2
const sources = globSync('{lib,primitives,components,blocks}/**/*.{ts,tsx}', { cwd: ROOT })
const contexts = sources.flatMap(file =>
  [...read(file).matchAll(/\b(?:const|let) (\w+) = createContext[<(]/g)].map(([, name]) => ({ file, name: name! })),
)
const emitted = [...chunks.keys()].map(file => ({ file, code: read(file) }))
for (const { file, name } of contexts) {
  const declared = emitted.filter(({ code }) =>
    new RegExp(`\\b(?:var|const|let) ${name}\\d* = createContext\\d*\\(`).test(code),
  )
  if (declared.length !== 1)
    failures.push(`${name} (${file}) is created ${declared.length} times: ${declared.map(c => c.file).join(', ')}`)
}

// A Button reads a SizeContext.Provider from `./lib/size-context` only when both share one instance.
// console.error muted: React warns about useLayoutEffect on the server.
const { SizeContext } = await import(`${PACKAGE}/lib/size-context`)
const { sizeMap } = await import(`${PACKAGE}/lib/size-scale`)
const { default: Button } = await import(`${PACKAGE}/components/button`)
const { error } = console
console.error = () => {}
const plain = renderToStaticMarkup(createElement(Button, null, 'x'))
const compact = renderToStaticMarkup(
  createElement(
    SizeContext.Provider,
    { value: { size: 'compact', setSize: () => {}, classes: sizeMap.compact } },
    createElement(Button, null, 'x'),
  ),
)
console.error = error
if (plain === compact)
  failures.push(`${PACKAGE}/components/button ignores the SizeContext of ${PACKAGE}/lib/size-context`)

// What `npm publish` ships. A `*` entry expands over the shipped files; bunup
// drops a .d.ts silently (a declaration cycle), so each JS needs its own.
const packed = spawnSync('npm', ['pack', '--dry-run', '--json'], { cwd: ROOT, encoding: 'utf8' })
const shipped = new Set<string>(JSON.parse(packed.stdout)[0].files.map((file: { path: string }) => file.path))
const specifiers: string[] = []
for (const [subpath, value] of Object.entries<string | { types: string; default: string }>(pkg.exports)) {
  if (typeof value === 'string') {
    if (!shipped.has(value.slice(2))) failures.push(`${subpath}: ${value} is not in the tarball`)
    continue
  }
  const [before, after = ''] = value.default.slice(2).split('*')
  const stars = subpath.includes('*')
    ? [...shipped]
        .filter(file => file.startsWith(before!) && file.endsWith(after))
        .map(file => file.slice(before!.length, file.length - after.length))
    : ['']
  if (!stars.length) failures.push(`${subpath} matches nothing in the tarball`)
  for (const star of stars) {
    const js = value.default.slice(2).replace('*', star)
    const types = value.types.slice(2).replace('*', star)
    if (!shipped.has(js)) failures.push(`${subpath}: ${js} is not in the tarball`)
    if (!shipped.has(types)) failures.push(`${subpath}: ${types} is not in the tarball`)
    specifiers.push(`${PACKAGE}${subpath.slice(1).replace('*', star)}`)
  }
}

const imports = specifiers.map(specifier => `await import(${JSON.stringify(specifier)})`).join('\n')
const node = spawnSync('node', ['--input-type=module', '-e', imports], { cwd: ROOT, encoding: 'utf8' })
if (node.status !== 0) failures.push(`an entry does not load in Node:\n${node.stderr}`)

const client = [...chunks.values()].filter(chunk => chunk.client).length
console.log(
  `${chunks.size} chunks, ${client} with "use client"; server-safe: ${[...SERVER_SAFE, ...variants].join(', ')}`,
)
console.log(
  `${contexts.length} contexts, one declaration each; Button follows ./lib/size-context: ${plain !== compact}`,
)
console.log(`${specifiers.length} exports entries with JS and .d.ts, all loaded in Node`)

if (failures.length) {
  console.error(failures.join('\n'))
  process.exit(1)
}

function target(subpath: string) {
  const [pattern, value] = Object.entries<{ default: string } | string>(pkg.exports).find(([key]) => {
    const [before, after = ''] = key.split('*')
    return key.includes('*') ? subpath.startsWith(before!) && subpath.endsWith(after) : key === subpath
  })!
  const [before, after = ''] = pattern.split('*')
  const star = subpath.slice(before!.length, subpath.length - after.length)
  return (value as { default: string }).default.slice(2).replace('*', star)
}
