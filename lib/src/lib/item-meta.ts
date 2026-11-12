import type { RepoConfig } from './schema'
import type { ParsedTag } from './tsdoc'

/** A link to where an item's code comes from. */
export interface SourceLink {
  href: string
  label: string
}

/** What an item's block tags say about its lifecycle and provenance. */
export interface ItemMeta {
  /** `@status x`, else the first of `@alpha` / `@beta` / `@experimental`. */
  status?: string
  since?: string
  /** Markdown; `''` for a bare `@deprecated`. */
  deprecated?: string
  licenses: string[]
  sources: SourceLink[]
}

const STATUS_MODIFIERS = new Set(['alpha', 'beta', 'experimental'])

export function itemMeta(tags: ParsedTag[]): ItemMeta {
  const meta: ItemMeta = { licenses: [], sources: [] }
  for (const { tag, text } of tags) {
    if (tag === 'status') meta.status = text
    else if (STATUS_MODIFIERS.has(tag)) meta.status ??= tag
    else if (tag === 'since') meta.since = text
    else if (tag === 'deprecated') meta.deprecated = text
    else if (tag === 'license' && text) meta.licenses.push(text)
    else if (tag === 'source' && text) meta.sources.push(sourceLink(text))
  }
  return meta
}

/** `@source <url> [label or commit]`: the label defaults to the url without its scheme. */
export function sourceLink(text: string): SourceLink {
  const [href = '', ...rest] = text.split(/\s+/)
  return { href, label: rest.join(' ') || href.replace(/^[a-z]+:\/\//, '') }
}

/** The repo's blob url for a file at `path`, relative to the project root. */
export function repoBlobUrl({ url, branch = 'main', dir }: RepoConfig, path: string): string {
  const prefix = dir ? `${dir.replace(/^\/+|\/+$/g, '')}/` : ''
  return `${url.replace(/\/+$/, '')}/blob/${branch}/${prefix}${path}`
}
