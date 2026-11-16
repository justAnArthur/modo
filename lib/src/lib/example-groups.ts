/**
 * What a top-level heading of an examples.mdx is on the page. The build
 * (`plugins/mdx-examples.ts`) decides it and marks the heading; the runtime
 * (`runtime/mdx.tsx`) only renders the mark.
 */
export interface HeadingRole {
  kind: 'group' | 'example' | 'sub'
  /** The rendered heading level; the TOC lists h2–h4. */
  level: 3 | 4 | 5
}

/**
 * The roles of a file's top-level `#` / `##` / `###` headings, from their
 * depths in document order. A `#` followed by a `##` (before the next `#`) is
 * a group (h3) and each `##` under it an example (h4); any other `#` or `##`
 * is an example (h3). A `###` is a sub-heading one level below its example.
 */
export function headingRoles(depths: readonly (1 | 2 | 3)[]): HeadingRole[] {
  let grouped = false
  let parent: 3 | 4 = 3
  return depths.map((depth, i) => {
    if (depth === 1) {
      grouped = depths.slice(i + 1).find(d => d < 3) === 2
      parent = 3
      return { kind: grouped ? 'group' : 'example', level: 3 }
    }
    if (depth === 2) {
      parent = grouped ? 4 : 3
      return { kind: 'example', level: parent }
    }
    return { kind: 'sub', level: parent === 3 ? 4 : 5 }
  })
}
