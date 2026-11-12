import { config } from 'virtual:modo-config'
import type { ItemEntry } from 'virtual:modo-items'
import { shell } from 'virtual:modo-shell'
import { itemMeta, repoBlobUrl } from '../../lib/item-meta'
import { Markdown } from '../markdown'
import { cap } from '../text'

/** Lifecycle from the item's block tags, plus its Source link when `repo` is set. Upstreams and
    licenses (`@source`, `@license`) are credited once, on the overview (pages/credits.tsx). */
export function PageMeta({ entry }: { entry: ItemEntry }) {
  const { status, since, deprecated } = itemMeta(entry.tags)
  const { repo } = config
  if (deprecated === undefined && !status && !since && !repo) return null

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
    </div>
  )
}
