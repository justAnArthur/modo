/*!
 * Local addition: the side pane's Changes — the session's changed files,
 * staged and unstaged, under a commit field, and the picked file's diff.
 */

'use client'

import Button from '@justanarthur/modo-ui/components/button'
import Diff, { parsePatch } from '@justanarthur/modo-ui/components/diff'
import ChoiceList from '@justanarthur/modo-ui/components/inputs/choice-list'
import Input from '@justanarthur/modo-ui/components/inputs/input'
import { useSize } from '@justanarthur/modo-ui/lib/size-context'
import { cn } from '@justanarthur/modo-ui/lib/utils'
import { type ReactNode, useState } from 'react'
import { useIcon } from '../../lib/icons'
import { IconAction, PaneEmpty, PaneSection } from '../../lib/pane-parts'
import type { PaneChange } from '../../lib/side-pane-types'

const STATUS_LETTER: Record<PaneChange['status'], string> = { added: 'A', modified: 'M', deleted: 'D' }

function countLines(patch: string) {
  const lines = parsePatch(patch)
  return {
    added: lines.filter(l => l.kind === 'add').length,
    removed: lines.filter(l => l.kind === 'remove').length,
  }
}

function splitPath(path: string) {
  const at = path.lastIndexOf('/')
  return { dir: path.slice(0, at), name: path.slice(at + 1) }
}

function FileRow({ change }: { change: PaneChange }) {
  const size = useSize()
  const { dir, name } = splitPath(change.path)
  const { added, removed } = countLines(change.patch)
  return (
    <span className="flex min-w-0 flex-1 items-center gap-2">
      <span className="w-3 shrink-0 font-mono text-caption text-muted-foreground">{STATUS_LETTER[change.status]}</span>
      <span className={cn('min-w-0 flex-1 truncate', size.text)}>
        <span className={cn('text-foreground', change.status === 'deleted' && 'line-through')}>{name}</span>
        <span className="text-caption text-muted-foreground"> {dir}</span>
      </span>
      {/* Gives way to the row's actions while they show. */}
      <span className="flex shrink-0 gap-1.5 font-mono text-caption tabular-nums transition-[opacity] duration-fast group-focus-within/pick:opacity-0 group-hover/pick:opacity-0 pointer-coarse:opacity-0">
        <span className="text-status-success">+{added}</span>
        <span className="text-status-error">−{removed}</span>
      </span>
    </span>
  )
}

function FileList({
  label,
  files,
  value,
  onValueChange,
  actions,
}: {
  label: string
  files: PaneChange[]
  value: string
  onValueChange: (path: string) => void
  actions: (change: PaneChange) => ReactNode
}) {
  const size = useSize()
  return (
    <ChoiceList
      label={label}
      value={value}
      onValueChange={onValueChange}
      rowClassName={cn('items-center py-0', size.control)}
      options={files.map(change => ({
        value: change.path,
        label: change.path,
        content: <FileRow change={change} />,
        actions: actions(change),
      }))}
    />
  )
}

interface ChangesPaneProps {
  /** The session's changed files, each with its patch. The pane keeps its own copy as you stage, revert and commit. */
  changes: PaneChange[]
  /** Called with the paths staged (`true`) or unstaged (`false`). */
  onStage?: (paths: string[], staged: boolean) => void
  /** Called with the paths reverted. */
  onRevert?: (paths: string[]) => void
  /** Called by Commit with the message (empty when Claude writes one) and the staged paths. */
  onCommit?: (message: string, paths: string[]) => void
  /** Called by the diff's open in editor with the file's path. */
  onOpenFile?: (path: string) => void
}

/**
 * The session's changes: staged and unstaged files under a commit field,
 * and the picked file's diff.
 *
 * A row shows the file's status letter, its name before its folder and the
 * lines it adds and removes; hovering it swaps the counts for its stage,
 * unstage and revert. Each section stages, unstages or reverts all at once.
 * Commit takes the staged files (an empty message lets Claude write one).
 * The picked file's diff wraps its long lines; the toggle above it scrolls
 * them instead. With nothing changed, the pane says the tree is clean.
 *
 * @example {@include ./examples.mdx}
 */
export default function ChangesPane({ changes, onStage, onRevert, onCommit, onOpenFile }: ChangesPaneProps) {
  const [files, setFiles] = useState(changes)
  const [picked, setPicked] = useState(changes[0]?.path ?? '')
  const [message, setMessage] = useState('')
  const [wrap, setWrap] = useState(true)
  const Plus = useIcon('plus')
  const Minus = useIcon('minus')
  const Revert = useIcon('rotate-ccw')
  const Wrap = useIcon('text-wrap')
  const Open = useIcon('external-link')

  if (files.length === 0)
    return <PaneEmpty icon="circle-check" title="No changes" detail="The working tree matches the last commit." />

  const staged = files.filter(f => f.staged)
  const unstaged = files.filter(f => !f.staged)
  const change = files.find(f => f.path === picked) ?? files[0]

  const setStaged = (paths: string[], value: boolean) => {
    setFiles(fs => fs.map(f => (paths.includes(f.path) ? { ...f, staged: value } : f)))
    onStage?.(paths, value)
  }
  const drop = (paths: string[]) => setFiles(fs => fs.filter(f => !paths.includes(f.path)))
  const revert = (paths: string[]) => {
    drop(paths)
    onRevert?.(paths)
  }
  const commit = () => {
    const paths = staged.map(f => f.path)
    drop(paths)
    setMessage('')
    onCommit?.(message, paths)
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 px-2 pb-1">
        <Input
          variant="bordered"
          aria-label="Commit message"
          placeholder={staged.length > 0 ? 'Message, or Claude writes one' : 'Stage files to commit'}
          value={message}
          onValueChange={setMessage}
          disabled={staged.length === 0}
          className="min-w-0 flex-1"
        />
        <Button size="compact" disabled={staged.length === 0} onClick={commit}>
          Commit
        </Button>
      </div>

      {staged.length > 0 && (
        <PaneSection
          title="Staged"
          meta={staged.length}
          actions={
            <IconAction
              icon={Minus}
              label="Unstage all"
              onClick={() =>
                setStaged(
                  staged.map(f => f.path),
                  false,
                )
              }
            />
          }
        >
          <FileList
            label="Staged files"
            files={staged}
            value={picked}
            onValueChange={setPicked}
            actions={f => <IconAction icon={Minus} label="Unstage" onClick={() => setStaged([f.path], false)} />}
          />
        </PaneSection>
      )}

      {unstaged.length > 0 && (
        <PaneSection
          title="Changes"
          meta={unstaged.length}
          actions={
            <>
              <IconAction icon={Revert} label="Revert all" onClick={() => revert(unstaged.map(f => f.path))} />
              <IconAction
                icon={Plus}
                label="Stage all"
                onClick={() =>
                  setStaged(
                    unstaged.map(f => f.path),
                    true,
                  )
                }
              />
            </>
          }
        >
          <FileList
            label="Unstaged files"
            files={unstaged}
            value={picked}
            onValueChange={setPicked}
            actions={f => (
              <>
                <IconAction icon={Revert} label="Revert" onClick={() => revert([f.path])} />
                <IconAction icon={Plus} label="Stage" onClick={() => setStaged([f.path], true)} />
              </>
            )}
          />
        </PaneSection>
      )}

      {change && (
        <PaneSection
          title={splitPath(change.path).name}
          meta={splitPath(change.path).dir}
          actions={
            <>
              <IconAction
                icon={Wrap}
                label={wrap ? 'Scroll long lines' : 'Wrap long lines'}
                pressed={wrap}
                onClick={() => setWrap(!wrap)}
              />
              <IconAction icon={Open} label="Open in editor" onClick={() => onOpenFile?.(change.path)} />
            </>
          }
        >
          <Diff wrap={wrap} patch={change.patch} />
        </PaneSection>
      )}
    </div>
  )
}

export type { ChangesPaneProps }

export { ChangesPane }
