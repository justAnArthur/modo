/*!
 * Local addition: the AI app's data shapes — profiles and their limits,
 * sessions and their groups, changes, checks, tasks, settings. Blocks take
 * these through props; the AI pages fill them with their mock data.
 */

/** The side pane's tabs. */
export type PaneId = 'changes' | 'file' | 'terminal' | 'pr' | 'artifacts' | 'tasks' | 'extension'

/** The tools the AI app's mock sessions call. */
export type ToolName = 'Bash' | 'Read' | 'Edit' | 'Write' | 'Grep' | 'Glob' | 'WebFetch' | 'Agent' | 'MCP' | 'TodoWrite'

import type { IconName } from './icons'

export interface UsageLimit {
  label: string
  /** Used share, 0–1. */
  value: number
  detail: string
  /** The rolling window's length. */
  windowHours: number
  /** Time until it resets. */
  resetsInHours: number
}

export interface Profile {
  id: string
  name: string
  /** The CLAUDE_CONFIG_DIR the profile's `claude` process runs with. */
  configDir: string
  plan: string
  /** `anthropic` signs in to claude.ai; `compatible` points ANTHROPIC_BASE_URL at another provider. */
  provider: 'anthropic' | 'compatible'
  /** The base URL of a compatible provider. */
  baseUrl?: string
  account: string
  defaultModel: string
  limits: UsageLimit[]
  /** Sessions running under the profile right now. */
  running: number
}

export type SessionStatus = 'running' | 'waiting' | 'unread' | 'idle'

/** What a waiting session asks, as the AgentPrompt that answers it. */
export type SessionPrompt =
  | { kind: 'permission'; tool: string; command: string; rule?: string }
  | { kind: 'question'; question: string; tag?: string; options: { label: string; description?: string }[] }

/** A turn's work, folded to one row (see Transcript.Work). */
export interface SessionWork {
  summary: string
  detail?: string
  tools: { tool: ToolName; summary: string; meta?: string }[]
}

export interface Session {
  id: string
  title: string
  status: SessionStatus
  profile: string
  /** Relative time of the last activity. */
  updated: string
  branch?: string
  pinned?: boolean
  /** Linked child sessions started from this one. */
  children?: Session[]
  /** What a waiting session waits on. */
  waitingOn?: string
  /** Its task list's progress. */
  tasks?: { done: number; total: number }
  /** The latest line of its transcript. */
  lastLine?: string
  /** Its project, when it is listed outside the project's group (pinned). */
  project?: string
  /** The latest assistant text. */
  reply?: string
  /** The latest turn's work. */
  work?: SessionWork
  /** What it waits on, to answer in place. */
  prompt?: SessionPrompt
}

export interface SessionGroup {
  /** A project folder, or a section the user made. */
  label: string
  kind: 'project' | 'section'
  /** A project's folder. It tells apart two folders of one name (`…/a/api`, `…/b/api`); without it a group is known by its kind and label. */
  path?: string
  sessions: Session[]
}

/** A folder sessions run in. */
export interface Project {
  label: string
  path: string
}

export interface Model {
  name: string
  /** One line on what it is for. */
  note: string
}

export interface PermissionMode {
  label: string
  /** What the agent may do without asking. */
  note: string
  icon: IconName
}

export interface Command {
  name: string
  description: string
  kind: 'command' | 'skill' | 'plugin'
}

export interface Change {
  path: string
  status: 'added' | 'modified' | 'deleted'
  added: number
  removed: number
  patch: string
}

export interface Check {
  name: string
  status: 'success' | 'running' | 'failed'
  detail: string
}

export interface Artifact {
  title: string
  kind: string
  updated: string
}

export interface BackgroundTask {
  title: string
  kind: 'agent' | 'shell' | 'session'
  status: 'running' | 'done' | 'failed'
  detail: string
}

export interface McpServer {
  name: string
  transport: 'stdio' | 'http' | 'sse'
  status: 'connected' | 'needs-auth' | 'failed' | 'disabled'
  tools: number
  scope: 'user' | 'project' | 'plugin'
  /** The command a stdio server runs, or the URL an http / sse server answers on. */
  target: string
  /** Env var names passed to the server; values stay in the config. */
  env?: string[]
  /** Tool names, once connected. */
  toolNames?: string[]
  /** Why a failed server stopped: the tail of its stderr. */
  error?: string
  /** Where a needs-auth server signs in. */
  authHost?: string
}

export interface Hook {
  event: string
  matcher: string
  command: string
  scope: 'user' | 'project'
  /** Seconds before the harness gives up on it. */
  timeout?: number
  /** The latest run: when, and the exit code (non-zero blocks or warns, by event). */
  lastRun?: { when: string; exit: number }
}

export interface Plugin {
  name: string
  description: string
  kind: 'plugin' | 'skill'
  enabled: boolean
}

export interface MemoryFile {
  name: string
  description: string
  type: 'user' | 'feedback' | 'project' | 'reference'
}

export interface Worktree {
  path: string
  branch: string
  session: string
  size: string
  state: 'active' | 'merged' | 'stale'
}

/** What a command palette row stands for, handed back by its `onSelect`. */
export type PaletteItem =
  | { kind: 'session'; id: string }
  | { kind: 'new-session'; project: string; profile: string }
  | { kind: 'command'; name: string }
  | { kind: 'pane'; pane: PaneId }
  | { kind: 'settings'; section?: string }
  | { kind: 'profile'; id: string }
  | { kind: 'profiles' }
  | { kind: 'search' }
  | { kind: 'shortcuts' }
