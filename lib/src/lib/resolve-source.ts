import { existsSync, readFileSync, realpathSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'

// A design system that publishes its sources maps them under a `source`
// export condition (`"./components/*": { "source": "./components/*/index.tsx", … }`).
// Docs prefer them: they carry the TSDoc and sit next to their examples.mdx.
// Everything else (typings, other packages) is left to TypeScript's resolution.
const CONDITIONS = ['source', 'import', 'default']
const TS_FILE = /\.[cm]?tsx?$/

interface PackageJson {
  name?: string
  exports?: unknown
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
  peerDependencies?: Record<string, string>
}

const packageJsons = new Map<string, PackageJson | null>()

/** Forgets every package.json read: a run starts with a fresh view of installs. */
export function clearPackageCache(): void {
  packageJsons.clear()
}

export function readPackageJson(dir: string): PackageJson | null {
  let pkg = packageJsons.get(dir)
  if (pkg !== undefined) return pkg
  try {
    pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')) as PackageJson
  } catch {
    pkg = null
  }
  packageJsons.set(dir, pkg)
  return pkg
}

/** `@scope/name/sub/path` → { name: '@scope/name', subpath: './sub/path' }; null for a relative or absolute path. */
function splitBare(spec: string): { name: string; subpath: string } | null {
  if (/^(?:\.{1,2}(?:\/|$)|\/|[a-zA-Z]:[\\/])/.test(spec) || spec.startsWith('node:')) return null
  const parts = spec.split('/')
  const nameLength = spec.startsWith('@') ? 2 : 1
  const name = parts.slice(0, nameLength).join('/')
  const rest = parts.slice(nameLength).join('/')
  return { name, subpath: rest ? `./${rest}` : '.' }
}

function findPackageDir(name: string, fromDir: string): string | null {
  for (let dir = fromDir; ; dir = dirname(dir)) {
    const candidate = join(dir, 'node_modules', name)
    if (existsSync(join(candidate, 'package.json'))) return candidate
    if (dirname(dir) === dir) return null
  }
}

function exportsEntry(exports: unknown, subpath: string): { target: unknown; star?: string } | null {
  const map =
    typeof exports === 'object' &&
    exports !== null &&
    !Array.isArray(exports) &&
    Object.keys(exports)[0]?.startsWith('.')
      ? (exports as Record<string, unknown>)
      : { '.': exports }
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

/** The target for the first condition (in CONDITIONS order, not key order) that has one. */
function pick(target: unknown, sawSource: { value: boolean }): string | null {
  if (typeof target === 'string') return target
  if (Array.isArray(target)) {
    for (const t of target) {
      const hit = pick(t, sawSource)
      if (hit) return hit
    }
    return null
  }
  if (typeof target !== 'object' || target === null) return null
  const conditions = target as Record<string, unknown>
  for (const condition of CONDITIONS) {
    if (!(condition in conditions)) continue
    if (condition === 'source') sawSource.value = true
    const hit = pick(conditions[condition], sawSource)
    if (hit) return hit
  }
  return null
}

function resolveExport(spec: string, fromDir: string): { file: string; sawSource: boolean } | null {
  const bare = splitBare(spec)
  if (!bare) return null
  const pkgDir = findPackageDir(bare.name, fromDir)
  if (!pkgDir) return null
  const exports = readPackageJson(pkgDir)?.exports
  if (exports === undefined) return null
  const entry = exportsEntry(exports, bare.subpath)
  if (!entry) return null

  const sawSource = { value: false }
  const target = pick(entry.target, sawSource)
  if (!target) return null
  const file = resolve(pkgDir, entry.star === undefined ? target : target.replaceAll('*', entry.star))
  if (file.endsWith('.d.ts') || !existsSync(file)) return null
  return { file: realpathSync(file), sawSource: sawSource.value }
}

/**
 * A bare specifier resolved through its package's `exports` with the
 * conditions `source`, `import`, `default` (in that priority), when that lands
 * on a TypeScript source file. Null otherwise: the caller falls back to
 * TypeScript's own resolution, which finds the `types` (.d.ts).
 */
export function resolveSourceExport(spec: string, fromDir: string): string | null {
  const hit = resolveExport(spec, fromDir)
  return hit?.sawSource && TS_FILE.test(hit.file) ? hit.file : null
}

/**
 * A bare specifier naming a file of an installed package (`@scope/ds/docs`),
 * for a `modo.config.ts` slot or panel reference: the same lookup as
 * `resolveSourceExport` (the `source` file when the package ships one), else
 * whatever the `import` / `default` condition points at, built JavaScript
 * included. Null for a relative or absolute path, or a package that doesn't
 * export it.
 */
export function resolvePackageFile(spec: string, fromDir: string): string | null {
  return resolveExport(spec, fromDir)?.file ?? null
}

/** The nearest dir above `file` holding a package.json. */
export function packageDirOf(file: string): string | null {
  for (let dir = dirname(file); ; dir = dirname(dir)) {
    if (readPackageJson(dir)) return dir
    if (dirname(dir) === dir) return null
  }
}

/** A design system documented with modo: it depends on the lib in any dependency field. */
export function isModoPackage(dir: string): boolean {
  const pkg = readPackageJson(dir)
  if (!pkg) return false
  return [pkg.dependencies, pkg.devDependencies, pkg.peerDependencies].some(deps => deps?.['@justanarthur/modo'])
}
