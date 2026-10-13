import { globSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'

// Puts `"use client"` on the emitted modules that hold React components,
// hooks or contexts, after bunup (Bun drops directives from sources). Pure
// helpers (`cn`, class tables, springs, date-locale) and re-export entries
// (the index.js barrel, lib/* and item entries) stay directive-free, so a
// React Server Component can call the helpers and each re-export keeps the
// boundary of the module it comes from. A module is a client one when its own
// code renders, calls a hook or creates a context, or when it uses a binding
// from a client module (`Object.assign(Root, …)` would run on a client
// reference on the server). `--list` prints the split.

const DIST = join(import.meta.dirname, '..', 'dist')
const DIRECTIVE = '"use client";\n'

const IMPORT = /^import\s*([^";]*?)\s*from\s*"([^"]+)";?$/gm
const SIDE_EFFECT_IMPORT = /^import\s*"[^"]+";?$/gm
const EXPORT = /^export\s*\{[\s\S]*?\};?$/gm
const COMMENT = /^\s*\/\/.*$/gm
const CLIENT =
  /\bjsx(?:s|DEV)?\d*\(|\bcreateContext\d*\(|\buse[A-Z]\w*\(|\bforwardRef\d*\(|\bextends\s+(?:\w+\.)?(?:Pure)?Component\b/

interface Module {
  code: string
  // the relative modules it takes bindings from (side-effect imports are ordering only)
  deps: string[]
  reExport: boolean
  client: boolean
}

// preset.js and docs/vite.js run in the host's Node, never in the browser
const files = globSync('**/*.js', { cwd: DIST }).filter(file => file !== 'preset.js' && file !== 'docs/vite.js')

const modules = new Map<string, Module>(
  files.map(file => {
    const emitted = readFileSync(join(DIST, file), 'utf8')
    const code = emitted.startsWith(DIRECTIVE) ? emitted.slice(DIRECTIVE.length) : emitted
    const deps = [...code.matchAll(IMPORT)]
      .map(([, , from]) => from!)
      .filter(from => from.startsWith('.'))
      .map(from => relative(DIST, join(DIST, dirname(file), from)))
    const own = code.replace(IMPORT, '').replace(SIDE_EFFECT_IMPORT, '').replace(EXPORT, '').replace(COMMENT, '')
    const reExport = own.trim() === ''
    return [file, { code, deps, reExport, client: CLIENT.test(own) }]
  }),
)

// a client dependency makes a module client until nothing changes
let changed = true
while (changed) {
  changed = false
  for (const module of modules.values()) {
    if (module.client || module.reExport) continue
    if (!module.deps.some(dep => modules.get(dep)?.client)) continue
    module.client = true
    changed = true
  }
}

for (const [file, { code, client }] of modules) writeFileSync(join(DIST, file), client ? DIRECTIVE + code : code)

if (process.argv.includes('--list')) {
  const sorted = [...modules].sort(([a], [b]) => a.localeCompare(b))
  for (const client of [true, false]) {
    console.log(client ? '"use client":' : 'no directive:')
    for (const [file, module] of sorted) if (module.client === client) console.log(`  ${file}${describe(module)}`)
  }
}

function describe({ code }: Module) {
  const sources = [...code.matchAll(/^\/\/ (\S+\.tsx?)$/gm)].map(([, source]) => source)
  return sources.length ? `  (${sources.join(', ')})` : ''
}
