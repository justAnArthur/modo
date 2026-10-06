import { shell } from 'virtual:modo-shell'
import { createContext, type ReactNode, useContext, useId, useMemo } from 'react'

export function slug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-|-$/g, '')
}

interface PageIds {
  used: Set<string>
  byInstance: Map<string, string>
}

const PageIdsContext = createContext<PageIds>({ used: new Set(), byInstance: new Map() })

/** A fresh id registry per page, so no two headings on it share an anchor. */
export function PageIdScope({ children }: { children: ReactNode }) {
  const ids = useMemo<PageIds>(() => ({ used: new Set(), byInstance: new Map() }), [])
  return <PageIdsContext.Provider value={ids}>{children}</PageIdsContext.Provider>
}

// Claimed per component instance (useId), so a StrictMode double render
// gets the same id back instead of `-2`.
function useUniqueId(base: string): string {
  const ids = useContext(PageIdsContext)
  const instance = useId()
  let id = ids.byInstance.get(instance)
  if (id) return id
  id = base
  for (let n = 2; ids.used.has(id); n++) id = `${base}-${n}`
  ids.used.add(id)
  ids.byInstance.set(instance, id)
  return id
}

/**
 * A heading with a page-unique id (from `id`, else its label) and a
 * hover-revealed `#` link to it. `modo` is its data-modo hook.
 */
export function Heading({
  level,
  label,
  id,
  modo,
  children = label,
}: {
  level: 2 | 3 | 4 | 5 | 6
  label: string
  id?: string
  modo?: string
  children?: ReactNode
}) {
  const unique = useUniqueId(id ?? slug(label))
  const H = `h${level}` as const
  return (
    <H data-modo={modo} id={unique}>
      {children}
      <Anchor id={unique} label={label} />
    </H>
  )
}

/**
 * Hover-revealed `#` link to a heading; sits inside the heading it targets.
 * The hook is on a wrapper: a host Link needn't forward data attributes.
 */
export function Anchor({ id, label }: { id: string; label: string }) {
  const { Link, Icon } = shell
  return (
    <span data-modo="anchor">
      <Link href={`#${id}`} aria-label={`Link to ${label}`}>
        <Icon name="link" label="#" />
      </Link>
    </span>
  )
}
