/*
 * Local addition: the transcript's message parts — the user's turn with its
 * attachments, pasted text and @-mentions, the assistant's markdown, thinking,
 * the streaming state and chapter breaks.
 */

import type { ReactNode } from 'react'
import ThinkingIndicator from '../../../components/AI/thinking-indicator'
import Accordion from '../../../components/accordion'
import { useIcon } from '../../../lib/icon-context'
import { useShape } from '../../../lib/shape-context'
import { cn } from '../../../lib/utils'

// Markdown rendered to elements: rhythm and type for the tags it produces.
// Code blocks are the Code primitive (a <pre> in its own frame).
export const PROSE =
  'flex min-w-0 flex-col gap-3 text-body text-foreground [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:mt-1 [&_h3]:text-subtitle [&_h3]:weight-semibold [&_strong]:weight-semibold [&_:not(pre)>code]:rounded-glyph [&_:not(pre)>code]:bg-active [&_:not(pre)>code]:px-1 [&_:not(pre)>code]:font-mono [&_:not(pre)>code]:text-caption [&_a]:underline [&_a]:decoration-border [&_a]:underline-offset-2'

export interface MentionProps {
  /** The file or folder path. */
  path: string
}

/** An @-mention of a file inside a message. */
export function Mention({ path }: MentionProps) {
  const At = useIcon('at-sign')
  return (
    <span className="inline-flex translate-y-px items-center gap-0.5 rounded-glyph bg-active px-1 align-baseline font-mono text-caption text-foreground">
      <At size={11} strokeWidth={2} className="shrink-0 text-muted-foreground" />
      {path}
    </span>
  )
}

export interface AttachmentProps {
  /** The file name. */
  name: string
  /** A short line under it: size, page count, line count. */
  detail?: string
  /** `pasted` is text pasted into the composer, folded to a chip. Defaults to `'file'`. */
  kind?: 'file' | 'image' | 'pasted'
}

/** A file, image or pasted text that came with a message. */
export function Attachment({ name, detail, kind = 'file' }: AttachmentProps) {
  const shape = useShape()
  const Icon = useIcon(kind === 'pasted' ? 'clipboard' : kind === 'image' ? 'image' : 'file-text')
  return (
    <span className={cn('inline-flex h-11 max-w-56 items-center gap-2 border border-border px-2.5', shape.item)}>
      <Icon size={16} strokeWidth={1.5} className="shrink-0 text-muted-foreground" />
      <span className="flex min-w-0 flex-col">
        <span className="truncate text-caption text-foreground">{name}</span>
        {detail && <span className="truncate text-caption text-muted-foreground">{detail}</span>}
      </span>
    </span>
  )
}

export interface UserMessageProps {
  /** The message: text with Mentions inline. */
  children: ReactNode
  /** Attachments and pasted text, shown above the text. */
  attachments?: ReactNode
}

/** The user's turn: a bubble on the right, attachments above it. */
export function UserMessage({ children, attachments }: UserMessageProps) {
  const shape = useShape()
  return (
    <div className="flex flex-col items-end gap-2 pl-[12%]">
      {attachments && <div className="flex flex-wrap justify-end gap-2">{attachments}</div>}
      <div className={cn('min-w-0 bg-muted px-3.5 py-2.5 text-body text-foreground', shape.container)}>{children}</div>
    </div>
  )
}

export interface AssistantMessageProps {
  /** The reply, as rendered markdown: paragraphs, lists, Code, Tools. */
  children: ReactNode
  /** Still arriving: the working dots follow the last block. Defaults to `false`. */
  streaming?: boolean
}

/** The assistant's turn: rendered markdown on the page, no bubble. */
export function AssistantMessage({ children, streaming = false }: AssistantMessageProps) {
  return (
    <div className={PROSE}>
      {children}
      {streaming && <Working />}
    </div>
  )
}

export interface ThinkingProps {
  /** How long it thought, shown in the row: `"12s"`. */
  duration: string
  /** The thinking text, folded until opened. */
  children: ReactNode
  /** Start unfolded. Defaults to `false`. */
  defaultOpen?: boolean
}

/** A folded thinking block: "Thought for 12s", the reasoning inside. */
export function Thinking({ duration, children, defaultOpen = false }: ThinkingProps) {
  return (
    <Accordion
      type="single"
      collapsible
      defaultValue={defaultOpen ? 'thinking' : undefined}
      className="-mx-3 w-auto max-w-none"
    >
      <Accordion.Item value="thinking">
        <Accordion.Trigger>Thought for {duration}</Accordion.Trigger>
        <Accordion.Content>
          <div className="flex flex-col gap-2 border-l border-border pl-3 text-body text-muted-foreground">
            {children}
          </div>
        </Accordion.Content>
      </Accordion.Item>
    </Accordion>
  )
}

/** The in-flight state at the end of the transcript. */
export function Working({ label }: { label?: string }) {
  return (
    <div className="flex items-center gap-2">
      <ThinkingIndicator variant="goo" size="compact" />
      {label && <span className="text-caption text-muted-foreground">{label}</span>}
    </div>
  )
}

export interface ChapterProps {
  /** The chapter's title, also its entry in the chapter list. */
  title: string
  /** The anchor id the chapter list jumps to. */
  id: string
}

/** A chapter break: a hairline with the chapter's title. */
export function Chapter({ title, id }: ChapterProps) {
  return (
    <div id={id} className="flex scroll-mt-4 items-center gap-3 pt-2">
      <span className="shrink-0 text-caption weight-medium text-muted-foreground">{title}</span>
      <span aria-hidden="true" className="h-px flex-1 bg-border" />
    </div>
  )
}
