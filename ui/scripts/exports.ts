import { globSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

// Writes one `./lib/<name>` export per lib/*.ts(x) into package.json, ahead
// of the build. A pattern export can't serve them: the `source` condition
// points at the real file, and lib mixes `.ts` with `.tsx`. A new lib module
// is exported by the next `bun run build`; commit the package.json it leaves.
// It also writes `./components/*/variants` and `./blocks/*/variants`: an item's
// server-callable class helpers (`variants.ts`, its own build entry), which
// `./components/*` would map to a `variants/index.js` that doesn't exist. The
// longer key wins over `./components/*` in Node's and Bun's pattern matching.
// `typesVersions` in package.json stays hand-kept: its patterns are wildcards (`lib/*` serves every lib
// module), so a new lib module needs no entry. It maps the subpaths to dist/**/*.d.ts for consumers on
// `moduleResolution: node`, which ignore `exports` and would type-check the shipped .tsx source.

type Conditions = Record<string, string>

const ROOT = join(import.meta.dirname, '..')
const PACKAGE = join(ROOT, 'package.json')
const LIB = './lib/'

const pkg = JSON.parse(readFileSync(PACKAGE, 'utf8')) as { exports: Record<string, Conditions | string> }

const lib = globSync('lib/*.{ts,tsx}', { cwd: ROOT })
  .sort()
  .map(file => {
    const name = file.slice('lib/'.length).replace(/\.tsx?$/, '')
    const conditions: Conditions = {
      types: `./dist/lib/${name}.d.ts`,
      source: `./${file}`,
      default: `./dist/lib/${name}.js`,
    }
    return [`${LIB}${name}`, conditions] as const
  })

const variants = ['components', 'blocks'].map(tier => {
  const conditions: Conditions = {
    types: `./dist/${tier}/*/variants.d.ts`,
    source: `./${tier}/*/variants.ts`,
    default: `./dist/${tier}/*/variants.js`,
  }
  return [`./${tier}/*/variants`, conditions] as const
})
const generated = new Set<string>(variants.map(([key]) => key))

// variants and lib entries follow the item tiers; everything else keeps its place
const rest = Object.entries(pkg.exports).filter(([key]) => !key.startsWith(LIB) && !generated.has(key))
const at = rest.findIndex(([key]) => key === './blocks/*') + 1
pkg.exports = Object.fromEntries([...rest.slice(0, at), ...variants, ...lib, ...rest.slice(at)])

// no trailing newline, as the release bump writes it
const next = JSON.stringify(pkg, null, 2)
if (next !== readFileSync(PACKAGE, 'utf8')) writeFileSync(PACKAGE, next)
