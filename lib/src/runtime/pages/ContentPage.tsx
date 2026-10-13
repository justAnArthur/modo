import { config } from 'virtual:modo-config'
import { type PageEntry, pages } from 'virtual:modo-pages'
import type { ReactNode } from 'react'
import { Heading } from '../anchor'
import { groupTitle } from '../groups'
import { ExampleBoundary } from '../items/examples'
import { mdxComponents, textOf } from '../mdx'
import { cap } from '../text'
import { NotFoundPage } from './NotFoundPage'

/** The frontmatter `title`, else the file name: `getting-started` → `Getting started`. */
export function pageTitle({ slug, frontmatter }: PageEntry): string {
  if (typeof frontmatter.title === 'string') return frontmatter.title
  if (slug === 'index') return config.name
  return cap(slug.split('/').at(-1)!.replaceAll('-', ' '))
}

// The page title is the only h1: `#` and `##` are its sections.
const heading = (level: 2 | 3 | 4) =>
  function PageHeading({ children }: { children?: ReactNode }) {
    return (
      <Heading level={level} label={textOf(children)}>
        {children}
      </Heading>
    )
  }

/** Example components plus headings with anchors, which feed "On this page". */
const pageComponents: Record<string, unknown> = {
  ...mdxComponents,
  h1: heading(2),
  h2: heading(2),
  h3: heading(3),
  h4: heading(4),
}

/** A free-form `pages/<slug>.mdx` (or `pages/<slug>/index.mdx`), under its frontmatter `title` and `description`. */
export function ContentPage({ slug }: { slug: string }) {
  const page = pages.find(p => p.slug === slug)
  if (!page) return <NotFoundPage />
  const { group, frontmatter, Component } = page
  // The folder above the page; a folder's own index.mdx (its slug has no file name) sits one up.
  const folders = group?.split('/') ?? []
  const eyebrow = folders.at(folders.length === slug.split('/').length ? -2 : -1)
  return (
    <article>
      <header>
        {eyebrow ? <p data-modo="page-eyebrow">{groupTitle(eyebrow)}</p> : null}
        <h1 data-modo="page-title">{pageTitle(page)}</h1>
        {typeof frontmatter.description === 'string' ? <p data-modo="page-lead">{frontmatter.description}</p> : null}
      </header>
      <div data-modo="prose">
        <ExampleBoundary>
          <Component components={pageComponents} />
        </ExampleBoundary>
      </div>
    </article>
  )
}
