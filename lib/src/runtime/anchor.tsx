import { shell } from 'virtual:modo-shell'
import { createContext, type ReactNode, useContext, useLayoutEffect, useMemo, useState } from 'react'

export function slug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-|-$/g, '')
}

const PageIdsContext = createContext(new Set<string>())

/** A fresh id registry per page, so no two headings on it share an anchor. */
export function PageIdScope({ children }: { children: ReactNode }) {
  const used = useMemo(() => new Set<string>(), [])
  return <PageIdsContext.Provider value={used}>{children}</PageIdsContext.Provider>
}

// Claimed on commit, in document order: a render that never commits (React 18
// StrictMode renders a mount twice, with a fresh useId each time) can't take
// an id and push the committed heading to `-2`.
function useUniqueId(base: string): string {
  const used = useContext(PageIdsContext)
  const [id, setId] = useState(base)
  useLayoutEffect(() => {
    let claimed = base
    for (let n = 2; used.has(claimed); n++) claimed = `${base}-${n}`
    used.add(claimed)
    setId(claimed)
    return () => {
      used.delete(claimed)
    }
  }, [used, base])
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
