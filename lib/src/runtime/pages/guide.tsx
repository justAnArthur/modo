import { config } from 'virtual:modo-config'
import { guides } from 'virtual:modo-guides'
import type { ReactNode } from 'react'
import { Heading } from '../anchor'
import { groupTitle } from '../groups'
import { ExampleBoundary } from '../items/examples'
import { mdxComponents, textOf } from '../mdx'
import { NotFoundPage } from './not-found'

// The guide's title is the page's only h1: `#` and `##` are its sections, and feed "On this page".
const heading = (level: 2 | 3 | 4) =>
  function GuideHeading({ children }: { children?: ReactNode }) {
    return (
      <Heading level={level} label={textOf(children)}>
        {children}
      </Heading>
    )
  }

const guideComponents: Record<string, unknown> = {
  ...mdxComponents,
  h1: heading(2),
  h2: heading(2),
  h3: heading(3),
  h4: heading(4),
}

/** A `guides/<slug>.mdx` (or `guides/<slug>/index.mdx`) under its title and description. */
export function GuidePage({ slug }: { slug: string }) {
  const guide = guides.find(g => g.slug === slug)
  if (!guide) return <NotFoundPage />
  const { group, title, description, Component } = guide
  // A folder's own index.mdx sits one level up: its eyebrow is the folder above.
  const folders = group?.split('/') ?? []
  const landing = folders.length === slug.split('/').length
  const folder = folders.at(landing ? -2 : -1)
  return (
    <article>
      <header>
        <p data-modo="page-eyebrow">{folder ? groupTitle(folder, config.groups) : 'Guides'}</p>
        <h1 data-modo="page-title">{title}</h1>
        {description ? <p data-modo="page-lead">{description}</p> : null}
      </header>
      <div data-modo="prose">
        <ExampleBoundary>
          <Component components={guideComponents} />
        </ExampleBoundary>
      </div>
    </article>
  )
}
