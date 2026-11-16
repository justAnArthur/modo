import { existsSync, readFileSync, realpathSync, statSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'

const EXTS = ['.tsx', '.ts', '.jsx', '.js']
const TS_FILE = /\.[cm]?tsx?$/
const MODO = '@justanarthur/modo'

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
  const { exports } = readPackageJson(pkgDir) ?? {}
  const file =
    exports === undefined
      ? resolveFile(resolve(pkgDir, bare.subpath))
      : exportedFile(pkgDir, exports, bare.subpath, pick)
  // Symlinked workspace packages: the real path, so the bundle sees one copy of each module.
  return file && realpathSync(file)
}

/**
 * The TypeScript source a package publishes for a bare specifier under its `source` export
 * condition (`"./x": { "source": "./x/index.tsx", "default": "./dist/x.js" }`), real path.
 * Null when the package has no `source` target for it, or that file isn't TypeScript or doesn't ship.
 */
export function resolveSourceExport(spec: string, fromDir: string): string | null {
  const bare = splitBare(spec)
  const pkgDir = bare && findPackageDir(bare.name, fromDir)
  const exports = pkgDir ? readPackageJson(pkgDir)?.exports : undefined
  if (!bare || !pkgDir || exports === undefined) return null
  const file = exportedFile(pkgDir, exports, bare.subpath, pickSource)
  return file && TS_FILE.test(file) ? realpathSync(file) : null
}

/** The nearest folder at or above `file`'s holding a package.json. */
export function packageDirOf(file: string): string | null {
  for (let dir = dirname(file); ; dir = dirname(dir)) {
    if (existsSync(join(dir, 'package.json'))) return dir
    if (dirname(dir) === dir) return null
  }
}

/** A design system documented with modo (its package.json depends on the lib, in any dependency field), or the lib itself. */
export function isModoPackage(pkgDir: string): boolean {
  const pkg = readPackageJson(pkgDir)
  if (pkg?.name === MODO) return true
  return [pkg?.dependencies, pkg?.devDependencies, pkg?.peerDependencies].some(deps => deps?.[MODO])
}

interface PackageJson {
  name?: string
  exports?: unknown
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
  peerDependencies?: Record<string, string>
}

function readPackageJson(dir: string): PackageJson | null {
  try {
    return JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')) as PackageJson
  } catch {
    return null
  }
}

function exportedFile(
  pkgDir: string,
  exports: unknown,
  subpath: string,
  choose: (target: unknown) => string | null,
): string | null {
  const entry = exportsEntry(exports, subpath)
  const target = entry && choose(entry.target)
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

/** Like `pick`, but only a target reached through a `source` condition. */
function pickSource(target: unknown): string | null {
  if (Array.isArray(target)) return target.map(pickSource).find(t => t !== null) ?? null
  if (typeof target !== 'object' || target === null) return null
  const conditions = target as Record<string, unknown>
  for (const condition of CONDITIONS) {
    if (!(condition in conditions)) continue
    const hit = condition === 'source' ? pick(conditions.source) : pickSource(conditions[condition])
    if (hit) return hit
  }
  return null
}
