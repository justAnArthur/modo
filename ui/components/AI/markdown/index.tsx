/*!
 * Local addition (not part of Fluid Functionalism): a markdown string as
 * React, set in Prose. marked's lexer reads the source and every token maps to
 * an element (the lib's `runtime/markdown.tsx` approach), so raw HTML shows as
 * text; fences render through Code and tables through Table. A streaming
 * source is settled first, so a half-typed marker never flashes.
 */

'use client'

import { Lexer, type MarkedToken, type Token, type Tokens } from 'marked'
import { Fragment, type ReactNode, useMemo } from 'react'
import { useIcon } from '../../../lib/icon-context'
import { cn } from '../../../lib/utils'
import Code from '../../../primitives/code'
import Table from '../../table'
import { Working } from '../message'
import Prose from '../prose'

// Literal tables: UnoCSS only generates the classes it can read whole.
const HEADING = {
  1: 'text-title weight-semibold',
  2: 'text-subtitle weight-semibold',
  3: 'text-subtitle weight-semibold',
}

const ALIGN = { left: 'text-left', center: 'text-center', right: 'text-right' }

const FENCE = /^ {0,3}(`{3,}|~{3,})/
const MARKER_ONLY = /^\s*([-*+]|\d+[.)]|#{1,6}|>|`{1,2}|~{1,2})?\s*$/

/**
 * A partial source made safe to show: an open fence stays code so far, a
 * last line holding only a marker waits for its text, and an open inline
 * code span or bold run is closed for now.
 */
function settle(source: string): string {
  const lines = source.split('\n')
  if (lines.filter(line => FENCE.test(line)).length % 2 === 1) return source

  const last = lines.pop() ?? ''
  if (MARKER_ONLY.test(last)) return lines.join('\n')

  let closed = last
  if ((closed.match(/`/g)?.length ?? 0) % 2 === 1) closed += '`'
  if ((closed.match(/\*\*/g)?.length ?? 0) % 2 === 1) closed += '**'
  return [...lines, closed].join('\n')
}

function TaskBox({ checked }: { checked: boolean }) {
  const Check = useIcon('check')
  return (
    <>
      <span
        aria-hidden="true"
        className={cn(
          'mr-1.5 inline-flex size-3.5 translate-y-0.5 items-center justify-center rounded-glyph border',
          checked ? 'border-foreground bg-foreground text-background' : 'border-control',
        )}
      >
        {checked && <Check size={10} strokeWidth={3} />}
      </span>
      <span className="sr-only">{checked ? 'Done: ' : 'To do: '}</span>
    </>
  )
}

function Blocks({ tokens }: { tokens: Token[] }) {
  return <>{tokens.map((t, i) => block(t as MarkedToken, i))}</>
}

function Inlines({ tokens }: { tokens: Token[] }) {
  return <>{tokens.map((t, i) => inline(t as MarkedToken, i))}</>
}

function table(t: Tokens.Table, key: number) {
  return (
    <div key={key} className="min-w-0 overflow-x-auto">
      <Table>
        <Table.Header>
          <Table.Row>
            {t.header.map((cell, i) => (
              <Table.Head key={i} className={cell.align ? ALIGN[cell.align] : undefined}>
                <Inlines tokens={cell.tokens} />
              </Table.Head>
            ))}
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {t.rows.map((row, r) => (
            <Table.Row key={r} index={r}>
              {row.map((cell, i) => (
                <Table.Cell key={i} className={cell.align ? ALIGN[cell.align] : undefined}>
                  <Inlines tokens={cell.tokens} />
                </Table.Cell>
              ))}
            </Table.Row>
          ))}
        </Table.Body>
      </Table>
    </div>
  )
}

function block(t: MarkedToken, key: number): ReactNode {
  switch (t.type) {
    case 'space':
      return null

    case 'paragraph':
      return (
        <p key={key}>
          <Inlines tokens={t.tokens} />
        </p>
      )

    case 'heading': {
      const level = Math.min(t.depth, 3) as 1 | 2 | 3
      const Tag = `h${level}` as const
      return (
        <Tag key={key} className={HEADING[level]}>
          <Inlines tokens={t.tokens} />
        </Tag>
      )
    }

    case 'code':
      return (
        <Code key={key} language={t.lang || 'plaintext'}>
          {t.text}
        </Code>
      )

    case 'blockquote':
      return (
        <blockquote key={key} className="flex flex-col gap-2 border-l-2 border-border pl-3 text-muted-foreground">
          <Blocks tokens={t.tokens} />
        </blockquote>
      )

    case 'list': {
      const items = t.items.map((item, i) => (
        <li key={i} className={cn(item.task && 'list-none')}>
          <Blocks tokens={item.tokens} />
        </li>
      ))
      if (!t.ordered) return <ul key={key}>{items}</ul>
      return (
        <ol key={key} start={t.start === '' ? undefined : t.start}>
          {items}
        </ol>
      )
    }

    case 'table':
      return table(t, key)

    case 'hr':
      return <hr key={key} className="h-px w-full border-0 bg-border" />

    case 'html':
      return <p key={key}>{t.text}</p>

    // A tight list item holds phrasing directly (text, a task checkbox).
    default:
      return inline(t, key)
  }
}

function inline(t: MarkedToken, key: number): ReactNode {
  switch (t.type) {
    case 'text':
      return t.tokens ? <Inlines key={key} tokens={t.tokens} /> : <Fragment key={key}>{t.text}</Fragment>

    case 'escape':
    case 'html':
      return <Fragment key={key}>{t.text}</Fragment>

    case 'codespan':
      return <code key={key}>{t.text}</code>

    case 'strong':
      return (
        <strong key={key}>
          <Inlines tokens={t.tokens} />
        </strong>
      )

    case 'em':
      return (
        <em key={key}>
          <Inlines tokens={t.tokens} />
        </em>
      )

    case 'del':
      return (
        <del key={key} className="text-muted-foreground">
          <Inlines tokens={t.tokens} />
        </del>
      )

    case 'br':
      return <br key={key} />

    case 'link': {
      const external = /^https?:\/\//.test(t.href)
      return (
        <a
          key={key}
          href={t.href}
          title={t.title ?? undefined}
          rel="noreferrer"
          target={external ? '_blank' : undefined}
        >
          <Inlines tokens={t.tokens} />
        </a>
      )
    }

    case 'image':
      return <img key={key} src={t.href} alt={t.text} title={t.title ?? undefined} className="max-w-full" />

    case 'checkbox':
      return <TaskBox key={key} checked={t.checked} />

    default:
      return null
  }
}

interface MarkdownProps {
  /** The markdown source. */
  children: string
  /** The source is still arriving: half-typed markers wait, an open fence shows as code so far, and the working dots follow the last block. Defaults to `false`. */
  streaming?: boolean
  /** Classes for the Prose column. */
  className?: string
}

/**
 * A markdown string rendered as text on the page, in Prose's type and rhythm.
 *
 * Paragraphs, headings, ordered, nested and task lists, quotes, rules,
 * tables (on Table) and fenced code (on Code, highlighted by its fence
 * language) become real elements; inline it reads bold, italic, struck-out
 * text, inline code, links and images. Raw HTML shows as the text it is,
 * never as markup. Links that leave the site open in a new tab.
 *
 * Set `streaming` while a reply arrives: a fence that hasn't closed shows as
 * code so far, a list marker or an open bold run waits for its text instead
 * of flashing, and the working dots follow the last block.
 *
 * @example {@include ./examples.mdx}
 */
export default function Markdown({ children, streaming = false, className }: MarkdownProps) {
  const tokens = useMemo(() => Lexer.lex(streaming ? settle(children) : children), [children, streaming])

  return (
    <Prose className={className}>
      <Blocks tokens={tokens} />
      {streaming && <Working />}
    </Prose>
  )
}

export type { MarkdownProps }
export { Markdown }
