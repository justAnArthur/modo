/*!
 * Local addition: the side pane's Changes — the session's changed files,
 * staged and unstaged, under a commit field, and the picked file's diff.
 */

'use client'

import Button from '@justanarthur/modo-ui/components/actions/button'
import Diff, { parsePatch } from '@justanarthur/modo-ui/components/data-display/diff'
import ChoiceList from '@justanarthur/modo-ui/components/inputs/choice-list'
import Input from '@justanarthur/modo-ui/components/inputs/input'
import { TooltipProvider } from '@justanarthur/modo-ui/components/overlays/tooltip'
import { useSize } from '@justanarthur/modo-ui/lib/size-context'
import { useControllableState } from '@justanarthur/modo-ui/lib/use-controllable-state'
import { cn } from '@justanarthur/modo-ui/lib/utils'
import { type ReactNode, useState } from 'react'
import { useIcon } from '../../../lib/icons'
import { IconAction, PaneEmpty, PaneSection } from '../../../lib/pane-parts'
import type { PaneChange } from '../../../lib/side-pane-types'

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

/** Applies an action's effect on the rows now, or once its promise resolves (not on `false` or a rejection). */
function after(result: unknown, apply: () => void) {
  if (!(result instanceof Promise)) return apply()
  result.then(
    ok => {
      if (ok !== false) apply()
    },
    () => {},
  )
}

interface ChangesPaneProps {
  /** The session's changed files, each with its patch. The pane shows them as given, with what you stage, revert and commit applied until the next `changes` arrives. */
  changes: PaneChange[]
  /** Called with the paths staged (`true`) or unstaged (`false`). The rows move at once. */
  onStage?: (paths: string[], staged: boolean) => void
  /** Called with the paths reverted. Return a promise (a confirm, then the discard) and the rows leave once it resolves, unless it resolves `false` or rejects; return nothing and they leave at once. */
  onRevert?: (paths: string[]) => unknown
  /** Called by Commit with the message (empty when Claude writes one) and the staged paths. The rows leave as `onRevert`'s do: once a returned promise resolves to anything but `false`, else at once. */
  onCommit?: (message: string, paths: string[]) => unknown
  /** Called by the diff's open in editor with the file's path. */
  onOpenFile?: (path: string) => void
  /** The picked file's path, controlled. Pair with `onFileChange`. A path not in `changes` shows the first file. */
  file?: string
  /** The file picked at first, when uncontrolled. Defaults to the first file. */
  defaultFile?: string
  /** Called with the path of the file picked. */
  onFileChange?: (path: string) => void
  /** The commit message, controlled. Pair with `onMessageChange`. */
  message?: string
  /** The commit message at first, when uncontrolled. Defaults to `''`. */
  defaultMessage?: string
  /** Called with the commit message as it is typed, and with `''` after a commit. */
  onMessageChange?: (message: string) => void
  /** Let an empty message commit, Claude writing it. `false` asks for a message instead (while the session is busy, say). Defaults to `true`. */
  canAutoCommit?: boolean
  /** What went wrong (git failed, the last action errored), in a line above the files. With no files, it shows instead of the clean tree. */
  error?: ReactNode
  /** The checked-out branch, in a row on top. Omit for no row. */
  branch?: string
  /** Commits the branch is ahead of its upstream, beside the branch. */
  ahead?: number
  /** Commits the branch is behind its upstream, beside the branch. */
  behind?: number
}

/** The checked-out branch and how far it is from its upstream. */
function BranchRow({ branch, ahead = 0, behind = 0 }: { branch: string; ahead?: number; behind?: number }) {
  const Branch = useIcon('git-branch')
  const Up = useIcon('arrow-up')
  const Down = useIcon('arrow-down')
  return (
    <div className="flex h-9 items-center gap-2 px-2 text-caption text-muted-foreground">
      <Branch size={14} strokeWidth={1.5} className="shrink-0" />
      <span className="min-w-0 truncate font-mono text-foreground">{branch}</span>
      {ahead > 0 && (
        <span className="flex shrink-0 items-center tabular-nums">
          <Up size={12} strokeWidth={1.5} aria-hidden />
          {ahead}
          <span className="sr-only"> ahead</span>
        </span>
      )}
      {behind > 0 && (
        <span className="flex shrink-0 items-center tabular-nums">
          <Down size={12} strokeWidth={1.5} aria-hidden />
          {behind}
          <span className="sr-only"> behind</span>
        </span>
      )}
    </div>
  )
}

/**
 * The session's changes: staged and unstaged files under a commit field,
 * and the picked file's diff.
 *
 * A row shows the file's status letter, its name before its folder and the
 * lines it adds and removes; hovering it swaps the counts for its stage,
 * unstage and revert. Each section stages, unstages or reverts all at once.
 * Commit takes the staged files (an empty message lets Claude write one,
 * unless `canAutoCommit` is `false`). The picked file's diff wraps its long
 * lines; the toggle above it scrolls them instead. With nothing changed,
 * the pane says the tree is clean.
 *
 * The files follow `changes`: what you press shows at once and holds until
 * the app hands in new `changes` (after its git refresh, say). A revert or
 * commit whose callback returns a promise waits on it, so a confirm dialog
 * or a failing git keeps the rows. `branch`, `ahead` and `behind` add a row
 * on top; `error` says what went wrong. The picked file and the message are
 * the pane's own, or yours through `file` and `message`.
 *
 * @example {@include ./examples.mdx}
 */
export default function ChangesPane({
  changes,
  onStage,
  onRevert,
  onCommit,
  onOpenFile,
  file,
  defaultFile,
  onFileChange,
  message: messageProp,
  defaultMessage = '',
  onMessageChange,
  canAutoCommit = true,
  error,
  branch,
  ahead,
  behind,
}: ChangesPaneProps) {
  const [local, setLocal] = useState({ source: changes, files: changes })
  const files = local.source === changes ? local.files : changes
  const [picked, setPicked] = useControllableState(file, defaultFile ?? changes[0]?.path ?? '', onFileChange)
  const [message, setMessage] = useControllableState(messageProp, defaultMessage, onMessageChange)
  const [wrap, setWrap] = useState(true)
  const Plus = useIcon('plus')
  const Minus = useIcon('minus')
  const Revert = useIcon('rotate-ccw')
  const Wrap = useIcon('text-wrap')
  const Open = useIcon('external-link')

  const errorLine = error ? (
    <div role="alert" className="px-2 text-caption text-status-error">
      {error}
    </div>
  ) : null
  const header = branch && <BranchRow branch={branch} ahead={ahead} behind={behind} />

  if (files.length === 0)
    return (
      <div className="flex flex-col gap-2">
        {header}
        {errorLine || (
          <PaneEmpty icon="circle-check" title="No changes" detail="The working tree matches the last commit." />
        )}
      </div>
    )

  const staged = files.filter(f => f.staged)
  const unstaged = files.filter(f => !f.staged)
  const change = files.find(f => f.path === picked) ?? files[0]
  const canCommit = staged.length > 0 && (canAutoCommit || message.trim() !== '')

  // Over what `changes` was when pressed: a newer `changes` replaces it all.
  const edit = (f: (files: PaneChange[]) => PaneChange[]) =>
    setLocal(l => ({ source: changes, files: f(l.source === changes ? l.files : changes) }))
  const drop = (paths: string[]) => edit(fs => fs.filter(f => !paths.includes(f.path)))
  const setStaged = (paths: string[], value: boolean) => {
    edit(fs => fs.map(f => (paths.includes(f.path) ? { ...f, staged: value } : f)))
    onStage?.(paths, value)
  }
  const revert = (paths: string[]) => after(onRevert?.(paths), () => drop(paths))
  const commit = () => {
    const paths = staged.map(f => f.path)
    const text = message
    setMessage('')
    after(onCommit?.(text, paths), () => drop(paths))
  }

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-2">
        {header}
        {errorLine}
        <div className="flex items-center gap-2 px-2 pb-1">
          <Input
            variant="bordered"
            aria-label="Commit message"
            placeholder={
              staged.length === 0
                ? 'Stage files to commit'
                : canAutoCommit
                  ? 'Message, or Claude writes one'
                  : 'Message'
            }
            value={message}
            onValueChange={setMessage}
            disabled={staged.length === 0}
            className="min-w-0 flex-1"
          />
          <Button size="compact" disabled={!canCommit} onClick={commit}>
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
    </TooltipProvider>
  )
}

export type { ChangesPaneProps }

export { ChangesPane }
