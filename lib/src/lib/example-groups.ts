// How the headings of an item's examples.mdx map to the page, shared by the
// build (mdx-examples.ts marks them) and the runtime (mdx.tsx renders them).
//
// A file with no `##` is flat: `#` is an example title (h3), `###` a
// sub-heading (h4). A file with a `##` is grouped: `#` is a group (h3), `##`
// an example inside it (h4), `###` a sub-heading below the TOC (h5).

/** The prop the build sets on every heading of a grouped file. */
export const GROUPED_PROP = 'data-grouped'

export interface HeadingRole {
  kind: 'group' | 'example' | 'sub'
  /** The rendered heading level; the TOC lists h2–h4. */
  level: 3 | 4 | 5
}

/** What a markdown heading of this depth is; deeper headings aren't mapped to examples. */
export function headingRole(depth: 1 | 2 | 3, grouped: boolean): HeadingRole {
  if (depth === 1) return { kind: grouped ? 'group' : 'example', level: 3 }
  // A `##` only occurs in a grouped file (it is what makes a file grouped).
  if (depth === 2) return { kind: 'example', level: grouped ? 4 : 3 }
  return { kind: 'sub', level: grouped ? 5 : 4 }
}

/** Whether a document's top-level nodes make it a grouped examples file. */
export function isGrouped(nodes: readonly { type: string; depth?: number }[]): boolean {
  return nodes.some(n => n.type === 'heading' && n.depth === 2)
}
