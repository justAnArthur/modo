import { shell } from 'virtual:modo-shell'
import { Lexer, type MarkedToken, type Token, type Tokens } from 'marked'
import { Fragment, type ReactNode } from 'react'
import { Heading } from './anchor'
import { CodeBlock } from './code-block'
import { contentHref } from './router'

// Sources are static build output, so lexing once per string is enough.
const lexed = new Map<string, Token[]>()

function lex(source: string): Token[] {
  let tokens = lexed.get(source)
  if (!tokens) {
    tokens = Lexer.lex(source).filter(t => t.type !== 'space')
    lexed.set(source, tokens)
  }
  return tokens
}

/**
 * TSDoc Markdown as React: links and fenced code go through the shell's Link
 * and Code, raw HTML shows as text. `inline` drops the `<p>` around a lone
 * paragraph (table cells, list rows).
 */
export function Markdown({ source, inline }: { source: string; inline?: boolean }) {
  const tokens = lex(source)
  const only = tokens[0]
  if (inline && tokens.length === 1 && only?.type === 'paragraph')
    return <Inlines tokens={(only as Tokens.Paragraph).tokens} />
  return <Blocks tokens={tokens} />
}

/** The first paragraph (the TSDoc summary) and everything after it. */
export function splitLead(source: string): { lead: Tokens.Paragraph | null; body: Token[] } {
  const tokens = lex(source)
  const first = tokens[0]
  if (first?.type !== 'paragraph') return { lead: null, body: tokens }
  return { lead: first as Tokens.Paragraph, body: tokens.slice(1) }
}

export function Blocks({ tokens }: { tokens: Token[] }) {
  return <>{tokens.map((t, i) => block(t as MarkedToken, i))}</>
}

export function Inlines({ tokens }: { tokens: Token[] }) {
  return <>{tokens.map((t, i) => inline(t as MarkedToken, i))}</>
}

function block(t: MarkedToken, key: number): ReactNode {
  switch (t.type) {
    case 'paragraph':
      return (
        <p key={key}>
          <Inlines tokens={t.tokens} />
        </p>
      )

    case 'heading':
      // The page owns the h1.
      return (
        <Heading key={key} level={Math.max(2, t.depth) as 2} label={t.text}>
          <Inlines tokens={t.tokens} />
        </Heading>
      )

    case 'code':
      return <CodeBlock key={key} code={t.text} language={t.lang || undefined} />

    case 'blockquote':
      return (
        <blockquote key={key}>
          <Blocks tokens={t.tokens} />
        </blockquote>
      )

    case 'list': {
      const items = t.items.map((item, i) => (
        <li key={i}>
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
      return (
        <table key={key}>
          <thead>
            <tr>
              {t.header.map((cell, i) => (
                <th key={i} style={{ textAlign: cell.align ?? undefined }}>
                  <Inlines tokens={cell.tokens} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {t.rows.map((row, r) => (
              <tr key={r}>
                {row.map((cell, i) => (
                  <td key={i} style={{ textAlign: cell.align ?? undefined }}>
                    <Inlines tokens={cell.tokens} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )

    case 'hr':
      return <hr key={key} />

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
        <del key={key}>
          <Inlines tokens={t.tokens} />
        </del>
      )

    case 'br':
      return <br key={key} />

    case 'link':
      return (
        <shell.Link key={key} href={contentHref(t.href)} title={t.title ?? undefined}>
          <Inlines tokens={t.tokens} />
        </shell.Link>
      )

    case 'image':
      return <img key={key} src={t.href} alt={t.text} title={t.title ?? undefined} />

    case 'checkbox':
      return (
        <Fragment key={key}>
          <input type="checkbox" checked={t.checked} disabled />{' '}
        </Fragment>
      )

    default:
      return null
  }
}
