/*!
 * Local addition: the side pane's data shapes — the session's changed files,
 * an open file, a shell, a pull request with its checks and reviews,
 * artifacts and background tasks. The pane blocks take these through props;
 * the pages fill them from pages/AI/mock-panes.ts.
 */

export interface PaneChange {
  path: string
  status: 'added' | 'modified' | 'deleted'
  staged: boolean
  patch: string
}

export interface PaneFile {
  path: string
  language: string
  source: string
}

export interface ShellEntry {
  command: string
  output: string[]
  /** Non-zero when the command failed. Defaults to 0. */
  exit?: number
}

export interface PaneShell {
  /** The shell's name, as the section title. */
  name: string
  cwd: string
  /** What the prompt shows before `$`. */
  prompt: string
  history: ShellEntry[]
}

export interface PaneCheck {
  name: string
  status: 'success' | 'running' | 'failed'
  /** The run time, or what it is doing while it runs. */
  detail: string
  /** The tail of the check's log. */
  log: string
}

export interface PaneReview {
  author: string
  where: string
  body: string
}

export interface PanePullRequest {
  number: number
  title: string
  branch: string
  base: string
  checks: PaneCheck[]
  reviews: PaneReview[]
}

export type ArtifactKind = 'page' | 'dashboard' | 'document' | 'diagram'

export interface PaneArtifact {
  title: string
  kind: ArtifactKind
  updated: string
}

export interface PaneTask {
  id: string
  title: string
  kind: 'agent' | 'shell' | 'session'
  status: 'running' | 'done' | 'failed' | 'stopped'
  detail: string
}
