/*!
 * Local addition (not part of Fluid Functionalism): one turn of a chat with an
 * AI. The user's turn is a bubble on the right with its attachments and
 * @-mentions; the assistant's is rendered markdown on the page (Markdown.Prose from modo-ui),
 * with the working dots while it streams (Fluid Functionalism's
 * ThinkingIndicator, in ./working.tsx). Generalised from the AI app's transcript.
 */

'use client'

import { MarkdownProse } from '@justanarthur/modo-ui/components/data-display/markdown'
import Lightbox from '@justanarthur/modo-ui/components/overlays/lightbox'
import { useShape } from '@justanarthur/modo-ui/lib/shape-context'
import { cn } from '@justanarthur/modo-ui/lib/utils'
import type { ReactNode } from 'react'
import { useIcon } from '../../../lib/icons'
import { Working as WorkingDots, type WorkingProps } from './working'

type MessageRole = 'user' | 'assistant'

type AttachmentKind = 'file' | 'image' | 'pasted'

interface MentionProps {
  /** The file or folder path. */
  path: string
}

/** An @-mention of a file inside a message. */
function MentionChip({ path }: MentionProps) {
  const At = useIcon('at-sign')
  return (
    <span className="inline-flex translate-y-px items-center gap-0.5 rounded-glyph bg-active px-1 align-baseline font-mono text-caption text-foreground">
      <At size={11} strokeWidth={2} className="shrink-0 text-muted-foreground" />
      {path}
    </span>
  )
}

interface AttachmentProps {
  /** The file name. */
  name: string
  /** A short line under it: size, page count, line count. */
  detail?: string
  /** `pasted` is text pasted into the composer, folded to a chip. Defaults to `'file'`. */
  kind?: AttachmentKind
  /** The image itself (a URL, a data or blob URL): the chip becomes a thumbnail that opens the full image. */
  src?: string
}

/** A file, image or pasted text that came with a message. */
function AttachmentChip({ name, detail, kind = 'file', src }: AttachmentProps) {
  const shape = useShape()
  const Icon = useIcon(kind === 'pasted' ? 'clipboard' : kind === 'image' ? 'image' : 'file-text')
  if (src)
    return (
      <Lightbox items={[{ src, alt: name, caption: detail ? `${name} · ${detail}` : name }]}>
        <Lightbox.Trigger index={0} label={`View ${name}`} className="border border-border" />
      </Lightbox>
    )
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

interface MessageProps {
  /** Who speaks: `user` is a bubble on the right, `assistant` is text on the page. */
  role: MessageRole
  /** The message: text with `Message.Mention`s for a user, rendered markdown for the assistant. */
  children: ReactNode
  /** A user's attachments and pasted text (`Message.Attachment`s), shown above the bubble. */
  attachments?: ReactNode
  /** The assistant's reply is still arriving: the working dots follow its last block. Defaults to `false`. */
  streaming?: boolean
  /** Classes for the root. */
  className?: string
}

/**
 * One turn of a conversation with an AI: what you asked, or what it answered.
 *
 * Your turn is a bubble on the right, on the muted fill, with its
 * attachments (files, images, pasted text folded to a chip) above it,
 * flush with its right edge, and @-mentions inline. An image attachment
 * given its `src` is a thumbnail instead, and opens the full image (a
 * Lightbox grown out of the thumbnail). The assistant's turn has no bubble: it is rendered
 * markdown on the page, in Markdown.Prose's type and rhythm, so a long answer reads
 * like a document. While the reply streams, the working dots follow its
 * last block.
 *
 * Statics:
 * - `Message.Mention` — an @-file chip inline in the text: `path`.
 * - `Message.Attachment` — a file, image or pasted-text chip: `name`, `detail`, `kind`; with `src`, an image thumbnail that opens the image.
 * - `Message.Working` — the in-flight dots on their own: three dots that melt
 *   into one blob and split again beside a word that cycles (Thinking,
 *   Planning, …) in the width of the longest, and an optional `label`. One
 *   static "Thinking…" is announced; reduced motion holds the dots apart and
 *   the word still.
 *
 * @example {@include ./examples.mdx}
 */
const Message = Object.assign(
  function Message({ role, children, attachments, streaming = false, className }: MessageProps) {
    const shape = useShape()

    if (role === 'assistant')
      return (
        <MarkdownProse className={className}>
          {children}
          {streaming && <WorkingDots />}
        </MarkdownProse>
      )

    return (
      <div className={cn('flex flex-col items-end gap-2 pl-[12%]', className)}>
        {attachments && <div className="flex flex-wrap items-end justify-end gap-2">{attachments}</div>}
        <div className={cn('min-w-0 bg-muted px-3 py-2 text-body text-foreground', shape.container)}>{children}</div>
      </div>
    )
  },
  // No key names a binding of this file: the declaration bundler renames a clashing
  // binding to Name2, and a key spelled like it goes along (`Message.Working2`).
  { Mention: MentionChip, Attachment: AttachmentChip, Working: WorkingDots },
)

export type { AttachmentKind, AttachmentProps, MentionProps, MessageProps, MessageRole, WorkingProps }
export { AttachmentChip as Attachment, MentionChip as Mention, Message, WorkingDots as Working }

export default Message
