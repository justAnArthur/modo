/*!
 * Local addition: the side pane's File — the open file under its path
 * crumb, with copy and open in editor.
 */

'use client'

import { useIcon } from '../../../lib/icon-context'
import { cn } from '../../../lib/utils'
import Code from '../../../primitives/code'
import { IconAction, PaneSection } from '../pane-parts'
import type { PaneFile } from '../side-pane-types'

function Breadcrumb({ path }: { path: string }) {
  const parts = path.split('/')
  const Chevron = useIcon('chevron-right')
  return (
    <span className="flex min-w-0 items-center gap-0.5">
      {parts.map((part, i) => {
        const last = i === parts.length - 1
        return (
          <span key={`${i}-${part}`} className={cn('flex items-center gap-0.5', last ? 'min-w-0' : 'shrink-0')}>
            <span className={cn(last ? 'truncate text-foreground' : 'weight-normal text-muted-foreground')}>
              {part}
            </span>
            {!last && <Chevron size={12} strokeWidth={1.5} className="shrink-0 text-muted-foreground" />}
          </span>
        )
      })}
    </span>
  )
}

interface FilePaneProps {
  /** The open file: its path, language and source. */
  file: PaneFile
  /** Called by open in editor with the file's path. */
  onOpen?: (path: string) => void
}

/**
 * The file the session has open, highlighted, under its path crumb.
 *
 * The crumb keeps the last three parts of the path, so the file name is what
 * stays when the pane is narrow; copy puts the whole path on the clipboard,
 * and open hands the file to your editor. A line under it says the language
 * and how long the file is.
 *
 * @example {@include ./examples.mdx}
 */
export default function FilePane({ file, onOpen }: FilePaneProps) {
  const Copy = useIcon('copy')
  const Open = useIcon('external-link')
  // The folders give way first: the file name is what tells two tabs apart.
  const crumbs = file.path.split('/').slice(-3).join('/')
  return (
    <PaneSection
      title={<Breadcrumb path={crumbs} />}
      actions={
        <>
          <IconAction icon={Copy} label="Copy path" onClick={() => navigator.clipboard?.writeText(file.path)} />
          <IconAction icon={Open} label="Open in editor" onClick={() => onOpen?.(file.path)} />
        </>
      }
    >
      <p className="m-0 px-2 pb-2 text-caption text-muted-foreground">
        {file.language} · {file.source.split('\n').length} lines · modified in this session
      </p>
      <Code language={file.language}>{file.source}</Code>
    </PaneSection>
  )
}

export type { FilePaneProps }
