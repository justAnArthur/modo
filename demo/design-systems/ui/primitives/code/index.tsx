import { Fragment } from 'react'
import { parse } from 'sugar-high/core'
import { lang, languages, type Language } from 'sugar-high/lang'
import type { TokenType } from 'sugar-high'
import { cn } from '../../_fluid/lib/utils'
import { SURFACE_BG } from '../../_fluid/lib/surface-classes'
import { useSurface } from '../../_fluid/lib/surface-context'
import ScrollArea from '../scroll-area'

// Literal class names so UnoCSS's extractor sees every one (same reason as
// SURFACE_BG); colors are the --syntax-* tokens in tokens/colors.css.
const TOKEN_CLASS: Record<TokenType, string> = {
  keyword: 'text-syntax-keyword',
  string: 'text-syntax-string',
  class: 'text-syntax-class',
  entity: 'text-syntax-entity',
  property: 'text-syntax-property',
  comment: 'text-syntax-comment italic',
  identifier: 'text-syntax-identifier',
  jsxliterals: 'text-syntax-jsx',
  sign: 'text-syntax-sign',
  break: '',
  space: '',
}

function highlight(source: string, language: Language['id']) {
  const config = languages.find((l) => l.id === language)?.config
  return parse(source, config).lines.map((line) => (
    <Fragment key={line.index}>
      {line.index > 0 && '\n'}
      {line.tokens.map((t, i) => (
        <span key={i} className={TOKEN_CLASS[t.type]}>{t.value}</span>
      ))}
    </Fragment>
  ))
}

/**
 * Source code in the theme's syntax colors, one surface step above whatever
 * it sits on.
 *
 * sugar-high tokenizes; each token type takes a `--syntax-*` token from
 * tokens/colors.css, so code follows light and dark like everything else.
 * Long lines scroll sideways under a fading edge instead of wrapping. It is
 * also the docs chrome's Code slot: every example's source and every fenced
 * block on these pages renders through it.
 *
 * {@include ./code.mdx}
 */
export default function Code({ children, language = 'tsx', className }: {
  /** The source to show; surrounding blank lines are trimmed. */
  children: string
  /** Fence name, alias or extension (`tsx`, `css`, `sh`, …). Unknown names render as plain text. Defaults to `'tsx'`. */
  language?: string
  /** Extra classes for the frame. */
  className?: string
}) {
  const level = Math.min(useSurface() + 1, 8)
  const source = children.trim()
  const id = lang(language)
  return (
    <ScrollArea orientation="horizontal" viewportClassName="scroll-fade-x" className={cn('rounded-xl', SURFACE_BG[level], className)}>
      <pre className="m-0 w-max min-w-full p-4 font-mono text-caption leading-relaxed text-foreground">
        <code>{id && id !== 'plaintext' ? highlight(source, id) : source}</code>
      </pre>
    </ScrollArea>
  )
}

export { Code }
