/*!
 * Local addition (not part of Fluid Functionalism): the type and rhythm for
 * rendered markdown — paragraphs, lists, headings, inline code and links —
 * so a reply reads as text on the page. Code blocks are the Code primitive.
 */

import type { ReactNode } from 'react'
import { cn } from '../../../lib/utils'

// Rhythm and type for the tags markdown produces; code blocks bring their own frame.
const PROSE =
  'flex min-w-0 flex-col gap-3 text-body text-foreground [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:mt-1 [&_h3]:text-subtitle [&_h3]:weight-semibold [&_strong]:weight-semibold [&_:not(pre)>code]:rounded-glyph [&_:not(pre)>code]:bg-active [&_:not(pre)>code]:px-1 [&_:not(pre)>code]:font-mono [&_:not(pre)>code]:text-caption [&_a]:underline [&_a]:decoration-border [&_a]:underline-offset-2'

interface ProseProps {
  /** Rendered markdown: paragraphs, lists, headings, Code blocks. */
  children?: ReactNode
  /** Classes for the column. */
  className?: string
}

/**
 * Rendered markdown, set as text on the page.
 *
 * A column of paragraphs, lists and headings in body type, with inline code
 * on a soft wash and links underlined in the hairline color; a Code block
 * inside keeps its own frame. It sets type and rhythm only, so it fits an
 * AI reply, a plan, a changelog or any rich text a page renders.
 *
 * @example {@include ./examples.mdx}
 */
export default function Prose({ children, className }: ProseProps) {
  return <div className={cn(PROSE, className)}>{children}</div>
}

export type { ProseProps }
export { PROSE, Prose }
