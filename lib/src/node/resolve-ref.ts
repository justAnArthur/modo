import { existsSync, readFileSync, realpathSync, statSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'

const EXTS = ['.tsx', '.ts', '.jsx', '.js']

// `source` first: a design system that publishes its sources maps them under
// it, and the docs bundle those rather than the built copy.
const CONDITIONS = ['source', 'import', 'default']

/**
 * A module reference from modo.config.ts, without its `#Export`: a path from the project root
 * (`./x` → x, x.{tsx,ts,jsx,js} or x/index.{tsx,ts,jsx,js}), else a package specifier
 * (`@scope/ds/docs`, see `resolvePackageFile`). A project path wins over a package of the same name.
 */
export function resolveUserFile(userRoot: string, ref: string): string | null {
  return resolveFile(resolve(userRoot, ref)) ?? resolvePackageFile(ref, userRoot)
}

function resolveFile(abs: string): string | null {
  if (!existsSync(abs)) return EXTS.map(ext => abs + ext).find(f => existsSync(f)) ?? null
  if (statSync(abs).isFile()) return abs
  return EXTS.map(ext => resolve(abs, `index${ext}`)).find(f => existsSync(f)) ?? null
}

/**
 * A file of an installed package named by a bare specifier (`@scope/ds/docs`), looked up through
 * `node_modules` from `fromDir` upwards: through the package's `exports` with the conditions
 * `source`, `import`, `default` in that order, else (a package without `exports`) the file or
 * folder at that subpath. Null for a relative or absolute path, or a package that doesn't have it.
 */
export function resolvePackageFile(spec: string, fromDir: string): string | null {
  const bare = splitBare(spec)
  if (!bare) return null
  const pkgDir = findPackageDir(bare.name, fromDir)
  if (!pkgDir) return null
  const { exports } = JSON.parse(readFileSync(join(pkgDir, 'package.json'), 'utf8')) as { exports?: unknown }
  const file =
    exports === undefined ? resolveFile(resolve(pkgDir, bare.subpath)) : exportedFile(pkgDir, exports, bare.subpath)
  // Symlinked workspace packages: the real path, so the bundle sees one copy of each module.
  return file && realpathSync(file)
}

function exportedFile(pkgDir: string, exports: unknown, subpath: string): string | null {
  const entry = exportsEntry(exports, subpath)
  const target = entry && pick(entry.target)
  if (!target) return null
  const file = resolve(pkgDir, entry.star === undefined ? target : target.replaceAll('*', entry.star))
  return existsSync(file) && !file.endsWith('.d.ts') ? file : null
}

/** `@scope/name/sub/path` → { name: '@scope/name', subpath: './sub/path' }; null for a relative or absolute path. */
function splitBare(spec: string): { name: string; subpath: string } | null {
  if (/^(?:\.{1,2}(?:\/|$)|\/|[a-zA-Z]:[\\/]|node:)/.test(spec)) return null
  const parts = spec.split('/')
  const nameLength = spec.startsWith('@') ? 2 : 1
  const rest = parts.slice(nameLength).join('/')
  return { name: parts.slice(0, nameLength).join('/'), subpath: rest ? `./${rest}` : '.' }
}

function findPackageDir(name: string, fromDir: string): string | null {
  for (let dir = fromDir; ; dir = dirname(dir)) {
    const candidate = join(dir, 'node_modules', name)
    if (existsSync(join(candidate, 'package.json'))) return candidate
    if (dirname(dir) === dir) return null
  }
}

/** The `exports` entry for a subpath: an exact key, else the `*` pattern with the longest prefix. */
function exportsEntry(exports: unknown, subpath: string): { target: unknown; star?: string } | null {
  const isSubpathMap =
    typeof exports === 'object' &&
    exports !== null &&
    !Array.isArray(exports) &&
    Object.keys(exports)[0]?.startsWith('.')
  const map = isSubpathMap ? (exports as Record<string, unknown>) : { '.': exports }
  if (subpath in map) return { target: map[subpath] }

  let best: { target: unknown; star: string; prefix: number } | null = null
  for (const [key, target] of Object.entries(map)) {
    const star = key.indexOf('*')
    if (star === -1) continue
    const head = key.slice(0, star)
    const tail = key.slice(star + 1)
    if (!subpath.startsWith(head) || !subpath.endsWith(tail) || subpath.length < key.length - 1) continue
    if (best && best.prefix >= head.length) continue
    best = { target, star: subpath.slice(head.length, subpath.length - tail.length), prefix: head.length }
  }
  return best
}

/** The target of the first condition, in CONDITIONS order (not key order), that has one. */
function pick(target: unknown): string | null {
  if (typeof target === 'string') return target
  if (Array.isArray(target)) return target.map(pick).find(t => t !== null) ?? null
  if (typeof target !== 'object' || target === null) return null
  const conditions = target as Record<string, unknown>
  for (const condition of CONDITIONS) {
    const hit = condition in conditions ? pick(conditions[condition]) : null
    if (hit) return hit
  }
  return null
}
