import { config } from 'virtual:modo-config'
import type { ItemEntry } from 'virtual:modo-items'
import { shell } from 'virtual:modo-shell'
import { itemMeta, repoBlobUrl } from '../../lib/item-meta'
import { Markdown } from '../markdown'
import { cap } from '../text'

/** Lifecycle and provenance from the item's block tags, plus its Source link when `repo` is set. */
export function PageMeta({ entry }: { entry: ItemEntry }) {
  const { status, since, deprecated, licenses, sources } = itemMeta(entry.tags)
  const { repo } = config
  const empty = deprecated === undefined && !status && !since && !repo && licenses.length === 0 && sources.length === 0
  if (empty) return null

  return (
    <div data-modo="page-meta">
      {deprecated !== undefined ? (
        <span data-modo="page-meta-entry" data-kind="deprecated">
          Deprecated
          {deprecated ? (
            <>
              : <Markdown source={deprecated} inline />
            </>
          ) : null}
        </span>
      ) : null}
      {status ? (
        <span data-modo="page-meta-entry" data-kind="status">
          {cap(status)}
        </span>
      ) : null}
      {since ? (
        <span data-modo="page-meta-entry" data-kind="since">
          Since {since}
        </span>
      ) : null}
      {repo ? (
        <span data-modo="page-meta-entry" data-kind="repo">
          <shell.Link href={repoBlobUrl(repo, entry.path)}>Source</shell.Link>
        </span>
      ) : null}
      {sources.map(source => (
        <span data-modo="page-meta-entry" data-kind="source" key={source.href}>
          Upstream <shell.Link href={source.href}>{source.label}</shell.Link>
        </span>
      ))}
      {licenses.map(license => (
        <span data-modo="page-meta-entry" data-kind="license" key={license}>
          {license}
        </span>
      ))}
    </div>
  )
}
