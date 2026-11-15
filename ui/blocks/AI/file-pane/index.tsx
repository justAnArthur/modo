/*!
 * Local addition: the side pane's File — the open file under its path
 * crumb, with copy and open in editor, and the session's files as a tree
 * to switch between.
 */

'use client'

import { useState } from 'react'
import Breadcrumb from '../../../components/navigation/breadcrumb'
import Tree, { type TreeItem } from '../../../components/navigation/tree'
import { useIcon } from '../../../lib/icon-context'
import Code from '../../../primitives/code'
import { IconAction, PaneSection } from '../pane-parts'
import type { PaneFile } from '../side-pane-types'

/** Paths to a tree whose ids are the paths: folders by their prefix, files by their full path. */
function toTree(paths: string[]) {
  const root: TreeItem[] = []
  for (const path of paths) {
    let level = root
    path.split('/').forEach((label, i, parts) => {
      const id = parts.slice(0, i + 1).join('/')
      let node = level.find(n => n.id === id)
      if (!node) {
        node = { id, label, ...(i < parts.length - 1 && { children: [] }) }
        level.push(node)
      }
      level = node.children ?? []
    })
  }
  return root
}

interface FilePaneProps {
  /** The open file: its path, language and source. */
  file: PaneFile
  /** The session's file paths, browsed as a tree. Omit for no tree toggle. */
  files?: string[]
  /** Called with the path picked in the tree (a folder's path when a folder is picked). */
  onPick?: (id: string) => void
  /** Called by open in editor with the file's path. */
  onOpen?: (path: string) => void
}

/**
 * The file the session has open, highlighted, under its path crumb.
 *
 * The crumb folds its middle folders into a menu when the pane is narrow,
 * so the file name is what stays; copy puts the whole path on the
 * clipboard, and open hands the file to your editor. With `files`, the
 * folder button shows the session's files above the source to switch
 * between. A line under it says the language and how long the file is.
 *
 * @example {@include ./examples.mdx}
 */
export default function FilePane({ file, files, onPick, onOpen }: FilePaneProps) {
  const [browsing, setBrowsing] = useState(false)
  const Copy = useIcon('copy')
  const Open = useIcon('external-link')
  const Folder = useIcon('folder')
  const parts = file.path.split('/')
  return (
    <PaneSection
      title={<Breadcrumb size="compact" items={parts.map(label => ({ label }))} />}
      actions={
        <>
          {files && (
            <IconAction
              icon={Folder}
              label={browsing ? 'Hide files' : 'Browse files'}
              pressed={browsing}
              onClick={() => setBrowsing(!browsing)}
            />
          )}
          <IconAction icon={Copy} label="Copy path" onClick={() => navigator.clipboard?.writeText(file.path)} />
          <IconAction icon={Open} label="Open in editor" onClick={() => onOpen?.(file.path)} />
        </>
      }
    >
      {files && browsing && (
        <Tree
          label="Session files"
          size="compact"
          items={toTree(files)}
          defaultValue={file.path}
          defaultExpanded={parts.slice(0, -1).map((_, i) => parts.slice(0, i + 1).join('/'))}
          onValueChange={onPick}
          className="mb-2"
        />
      )}
      <p className="m-0 px-2 pb-2 text-caption text-muted-foreground">
        {file.language} · {file.source.split('\n').length} lines · modified in this session
      </p>
      <Code language={file.language}>{file.source}</Code>
    </PaneSection>
  )
}

export type { FilePaneProps }
