/*
 * Local addition (not part of Fluid Functionalism): a unified diff of one
 * file, read from a patch string. Added and removed lines take the success
 * and error status hues as text on a 16% wash, the system's way of showing a
 * status; the frame sits one surface step up, like Code.
 */

import type { ReactNode } from 'react'
import { useIcon } from '../../../lib/icon-context'
import { SURFACE_BG } from '../../../lib/surface-classes'
import { useSurface } from '../../../lib/surface-context'
import { cn } from '../../../lib/utils'
import ScrollArea from '../../../primitives/scroll-area'

type DiffLineKind = 'add' | 'remove' | 'context' | 'hunk'

interface DiffLine {
  kind: DiffLineKind
  text: string
  oldNo?: number
  newNo?: number
}

// Literal tables: UnoCSS only generates the classes it can read whole.
const ROW: Record<DiffLineKind, string> = {
  add: 'bg-status-success/16',
  remove: 'bg-status-error/16',
  context: '',
  hunk: 'bg-hover text-muted-foreground',
}
const SIGN: Record<DiffLineKind, string> = {
  add: 'text-status-success',
  remove: 'text-status-error',
  context: 'text-muted-foreground',
  hunk: 'text-muted-foreground',
}
const SIGN_CHAR: Record<DiffLineKind, string> = { add: '+', remove: '−', context: ' ', hunk: '' }

/** Reads a unified diff (`@@ -a,b +c,d @@` hunks, `+`/`-`/space lines); file headers are skipped. */
function parsePatch(patch: string): DiffLine[] {
  const lines: DiffLine[] = []
  let oldNo = 0
  let newNo = 0
  for (const raw of patch.replace(/^\n+|\n+$/g, '').split('\n')) {
    if (raw.startsWith('+++') || raw.startsWith('---')) continue

    const hunk = raw.match(/^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@(.*)$/)
    if (hunk) {
      oldNo = Number(hunk[1])
      newNo = Number(hunk[2])
      lines.push({ kind: 'hunk', text: raw })
      continue
    }

    if (raw.startsWith('+')) lines.push({ kind: 'add', text: raw.slice(1), newNo: newNo++ })
    else if (raw.startsWith('-')) lines.push({ kind: 'remove', text: raw.slice(1), oldNo: oldNo++ })
    else lines.push({ kind: 'context', text: raw.slice(1), oldNo: oldNo++, newNo: newNo++ })
  }
  return lines
}

interface DiffProps {
  /** The change as a unified diff: hunk headers and `+`, `-` and space-prefixed lines. */
  patch: string
  /** The file's path, shown in the header with the added and removed counts. Omit it for a bare diff. */
  path?: string
  /** Show the old and new line numbers in the gutter. Defaults to `true`. */
  lineNumbers?: boolean
  /** Extra content on the right of the header, such as an action. */
  actions?: ReactNode
  /** Classes for the frame. */
  className?: string
}

/**
 * One file's change as a unified diff: what was removed, what was added and
 * the lines around them.
 *
 * Pass the patch as text, the way `git diff` or an edit tool prints it. Each
 * added line is tinted with the success hue and each removed line with the
 * error hue, as tinted text on a wash rather than a solid fill; hunk headers
 * sit on the hover overlay. With a `path` the header counts the change
 * (`+12 −3`). Long lines scroll sideways under a fading edge instead of
 * wrapping, and the frame lifts one surface step above whatever holds it, as
 * Code does.
 *
 * @example {@include ./examples.mdx}
 */
export default function Diff({ patch, path, lineNumbers = true, actions, className }: DiffProps) {
  const level = Math.min(useSurface() + 1, 8)
  const FileIcon = useIcon('file-diff')
  const lines = parsePatch(patch)
  const added = lines.filter(l => l.kind === 'add').length
  const removed = lines.filter(l => l.kind === 'remove').length

  return (
    <div className={cn('flex min-w-0 flex-col overflow-hidden rounded-xl', SURFACE_BG[level], className)}>
      {path && (
        <div className="flex h-9 items-center gap-2 border-b border-border px-3">
          <FileIcon size={14} strokeWidth={1.5} className="shrink-0 text-muted-foreground" />
          <span className="min-w-0 truncate font-mono text-caption text-foreground">{path}</span>
          <span className="shrink-0 font-mono text-caption tabular-nums text-status-success">+{added}</span>
          <span className="shrink-0 font-mono text-caption tabular-nums text-status-error">−{removed}</span>
          {actions && <div className="ml-auto flex shrink-0 items-center gap-1">{actions}</div>}
        </div>
      )}
      <ScrollArea orientation="horizontal" viewportClassName="scroll-fade-x">
        <div className="w-max min-w-full py-1 font-mono text-caption">
          {lines.map((line, i) => (
            <div key={i} className={cn('flex min-w-full', ROW[line.kind])}>
              {lineNumbers && line.kind !== 'hunk' && (
                <span aria-hidden="true" className="flex w-16 shrink-0 select-none text-muted-foreground tabular-nums">
                  <span className="w-8 pr-1 text-right">{line.oldNo ?? ''}</span>
                  <span className="w-8 pr-1 text-right">{line.newNo ?? ''}</span>
                </span>
              )}
              <span aria-hidden="true" className={cn('w-5 shrink-0 select-none text-center', SIGN[line.kind])}>
                {SIGN_CHAR[line.kind]}
              </span>
              <span className="sr-only">{line.kind === 'add' ? 'added' : line.kind === 'remove' ? 'removed' : ''}</span>
              <span className="whitespace-pre pr-4 text-foreground">{line.text || ' '}</span>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}

export type { DiffLine, DiffLineKind, DiffProps }
export { Diff, parsePatch }
