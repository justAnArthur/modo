import { spawnSync } from 'node:child_process'
import { globSync, readFileSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'

// After `bun run build`, ui's check (ui/scripts/check-dist.ts) for the kit:
// - "use client" marks exactly the client chunks.
// - Each React context is created once in dist/: the barrel, the items and
//   the `./lib/*` subpaths share it. modo-ui stays an import, so its own
//   contexts are the host's copy.
// - Every `exports` entry ships its JS and its .d.ts, and loads in Node.
// - The item sources a modo host documents from ship with what they reach.

const ROOT = join(import.meta.dirname, '..')
const PACKAGE = '@justanarthur/modo-ui-ai'
const DIRECTIVE = '"use client";\n'
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

const files = globSync('dist/**/*.js', { cwd: ROOT })
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

// Bun renames a clashing binding to Name2, a clashing import to createContext2
const sources = globSync('{lib,components,blocks}/**/*.{ts,tsx}', { cwd: ROOT })
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

// What `npm publish` ships. A `*` entry expands over the shipped files; bunup
// drops a .d.ts silently (a declaration cycle), so each JS needs its own.
const packed = spawnSync('npm', ['pack', '--dry-run', '--json'], { cwd: ROOT, encoding: 'utf8' })
const shipped = new Set<string>(JSON.parse(packed.stdout)[0].files.map((file: { path: string }) => file.path))
const specifiers: string[] = []
const sourceTargets: string[] = []
for (const [subpath, value] of Object.entries<string | { types: string; source?: string; default: string }>(
  pkg.exports,
)) {
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
    const source = value.source?.slice(2).replace('*', star)
    if (source && !shipped.has(source)) failures.push(`${subpath}: its source ${source} is not in the tarball`)
    if (source) sourceTargets.push(source)
    specifiers.push(`${PACKAGE}${subpath.slice(1).replace('*', star)}`)
  }
}

const imports = specifiers.map(specifier => `await import(${JSON.stringify(specifier)})`).join('\n')
const node = spawnSync('node', ['--input-type=module', '-e', imports], { cwd: ROOT, encoding: 'utf8' })
if (node.status !== 0) failures.push(`an entry does not load in Node:\n${node.stderr}`)

// A modo host bundles and documents a re-exported item from its `source`: every file
// that source reaches (relative imports, `{@include}`d examples) must ship, and every
// package it imports must be one the host installs with ui.
const installed = new Set([...Object.keys(pkg.dependencies), ...Object.keys(pkg.peerDependencies)])
const SPECIFIER =
  /^\s*(?:import|export)\s[^'";]*?from\s*['"]([^'"]+)['"]|^\s*import\s*['"]([^'"]+)['"]|\bimport\(\s*['"]([^'"]+)['"]\s*\)|\{@include(?:Code)?\s+([^\s}]+)\s*\}/gm
// code to read in an examples.mdx, not code that runs
const FENCE = /^```[\s\S]*?^```/gm
const reached = new Set<string>()
const queue = [...sourceTargets]
for (let file = queue.pop(); file; file = queue.pop()) {
  if (reached.has(file)) continue
  reached.add(file)
  for (const [, ...groups] of read(file).replace(FENCE, '').matchAll(SPECIFIER)) {
    const spec = groups.find(Boolean)!
    if (!spec.startsWith('.')) {
      const name = spec
        .split('/')
        .slice(0, spec.startsWith('@') ? 2 : 1)
        .join('/')
      if (!installed.has(name)) failures.push(`${file} imports ${spec}, which is not a dependency`)
      continue
    }
    const base = join(dirname(file), spec)
    const hit = ['', '.ts', '.tsx', '/index.ts', '/index.tsx'].map(ext => base + ext).find(f => shipped.has(f))
    if (hit) queue.push(hit)
    else failures.push(`${file} imports ${spec}, which is not in the tarball`)
  }
}

const client = [...chunks.values()].filter(chunk => chunk.client).length
console.log(`${chunks.size} chunks, ${client} with "use client"`)
console.log(`${contexts.length} contexts, one declaration each`)
console.log(`${specifiers.length} exports entries with JS and .d.ts, all loaded in Node`)
console.log(`${sourceTargets.length} source targets shipped, reaching ${reached.size} shipped files`)

if (failures.length) {
  console.error(failures.join('\n'))
  process.exit(1)
}
