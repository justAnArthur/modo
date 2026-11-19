/*!
 * Local addition: the just-standards model as the UI reads it. It mirrors the
 * engine's `core/schema.ts` and `core/cells.ts` (zod there, plain types here),
 * plus the run states only the app knows: a worker on a cell, a PR open for it.
 */

/** What an asset is. The MVP's packs cover `website`, `webapp` and `repo`. */
export type AssetKind = 'website' | 'webapp' | 'mobile' | 'repo' | 'social' | 'newsletter' | 'api'

/** Assertions on one value: a header, an attribute, a file, a field. A bare assertion means "exists". */
export interface ValueAssertion {
  equals?: string
  matches?: string
  not_matches?: string
  /** chars for text, items for lists */
  min_length?: number
  max_length?: number
  absolute_url?: boolean
  json?: boolean
  /** fetch the value as a URL and expect this of the response */
  follow?: { status: number; content_type?: string; max_bytes?: number }
}

export type HttpExpect =
  | { status: number }
  | ({ header: string } & ValueAssertion)
  | ({ body: true } & ValueAssertion)
  | ({ select: string; attr?: string } & ValueAssertion)

/** `untracked`: a path that must not be tracked. */
export type RepoExpect = ({ file: string } & ValueAssertion) | { untracked: string }

export type GithubField = 'description' | 'topics' | 'homepage' | 'license' | 'readme' | 'archived' | 'private'

/** How an item is measured. */
export type Check =
  | { kind: 'http'; requests: { path: string; expect: HttpExpect[] }[] }
  | { kind: 'repo'; expect: RepoExpect[] }
  | { kind: 'github'; expect: ({ field: GithubField } & ValueAssertion)[] }
  | { kind: 'script'; file: string }
  | { kind: 'ai'; prompt: string; model: string }

/** One standard: a check plus why it matters. */
export interface Item {
  id: string
  version: number
  title: string
  why: string
  applies_to: AssetKind[]
  owner_role?: string
  check: Check
}

/** An item as loaded from its pack. */
export interface LoadedItem extends Item {
  pack: string
  /** `pack/item` */
  key: string
  /** the pack version that added it */
  since: number
  /** A short name for a narrow column head, such as `og:video`. Defaults to the title. */
  label?: string
  /** How to make it pass: the item's `recipe.md`, Markdown, the part of a fix prompt the item brings. */
  recipe?: string
}

/** A versioned set of items. */
export interface Pack {
  id: string
  version: number
  title: string
  description?: string
  /** in order; `since` is the pack version that added the item */
  items: (string | { id: string; since: number })[]
  changelog: { version: number; date: string; notes: string }[]
}

export interface LoadedPack extends Pack {
  entries: LoadedItem[]
}

/** Something a business owns. */
export interface Asset {
  id: string
  kind: AssetKind
  url?: string
  /** owner/name on GitHub */
  repo?: string
  /** local checkout; `~` allowed */
  path?: string
  stack?: string
}

export interface Waiver {
  /** `pack/item` */
  item: string
  /** Every asset when left out. */
  asset?: string
  reason: string
  /** An ISO date. */
  until?: string
}

/** Something I run. */
export interface Business {
  id: string
  name: string
  assets: Asset[]
  /** `website` follows the latest version, `website@1` stays on it */
  packs: string[]
  /** The default worker's id. */
  worker?: string
  waivers: Waiver[]
}

/**
 * What a worker may do without asking, Claude Code's permission modes: `manual` asks for everything,
 * `acceptEdits` lets file edits through, `auto` lets Claude Code decide what is safe to run, `dontAsk`
 * denies what isn't allowed instead of asking, `plan` edits nothing, `bypassPermissions` runs anything
 * inside the worktree.
 */
export type PermissionMode = 'manual' | 'acceptEdits' | 'auto' | 'dontAsk' | 'plan' | 'bypassPermissions'

/** How hard a worker's model thinks. */
export type Effort = 'low' | 'medium' | 'high' | 'xhigh' | 'max'

/** Someone a cell can be given to: a Claude Code preset in the MVP. */
export interface Worker {
  id: string
  runtime: 'claude-code'
  /** The Claude Code config dir it starts from: `~/.claude`. */
  profile: string
  model: string
  effort?: Effort
  permission_mode: PermissionMode
  /** Permission rules allowed without asking: `Bash(git *)`. */
  allow: string[]
}

/** A Claude Code profile on this machine: a config dir and the account signed in to it. */
export interface ClaudeProfile {
  /** `~/.claude`, `~/.claude-work`. */
  configDir: string
  label: string
  /** Someone is signed in to it. */
  signedIn?: boolean
  /** Who, when Claude Code says. */
  account?: string
}

/** A check's verdict. `error` means it couldn't check: it is never shown as red. */
export type State = 'pass' | 'fail' | 'error'

/** One check of one cell. */
export interface Result {
  business: string
  asset: string
  /** `pack/item` */
  item: string
  item_version: number
  state: State
  evidence: string
  checked_at: string
  ms: number
  /** What the check did on the way to its verdict, when the engine recorded it. */
  log?: ResultLog
}

/** One assertion of a check and what it found. */
export interface AssertionLog {
  /** What was read: `meta[property="og:video"] @content`, `header strict-transport-security`, `README.md`, `topics`. */
  target: string
  /** The assertion written out: `exists`, `equals video/mp4`, `matches ^max-age=`. */
  expected: string
  /** The value found, truncated; left out when there was none. */
  actual?: string
  pass: boolean
}

/** One request of an http check: where it went, what came back, and the assertions on it. */
export interface HttpRequestLog {
  url: string
  /** Where the redirects ended, when they moved it. */
  final_url?: string
  status: number
  ms: number
  assertions: AssertionLog[]
}

/** A Claude Code session as the UI reads it: the stream-json events folded into turns. */
export type TranscriptItem =
  | { kind: 'user'; id: string; text: string }
  | { kind: 'text'; id: string; text: string }
  | { kind: 'thinking'; id: string; text: string }
  | {
      kind: 'tool'
      id: string
      /** `Read`, `Edit`, `Bash`, … */
      name: string
      input: Record<string, unknown>
      /** Left out while the tool runs. */
      result?: string
      is_error?: boolean
      ms?: number
    }

/** What a check did, by its kind: the requests and assertions, the reads, the script's output or the model's transcript. */
export type ResultLog =
  | { kind: 'http'; requests: HttpRequestLog[] }
  | {
      kind: 'repo' | 'github'
      /** The checkout's path, or `github.com/owner/name`. */
      source: string
      assertions: AssertionLog[]
    }
  | {
      kind: 'script'
      file: string
      /** Its stdout and stderr as printed, ANSI kept. */
      lines: string[]
    }
  | { kind: 'ai'; model: string; transcript: TranscriptItem[] }

/** A worker's session on one or more cells: a Claude Code run in a worktree that ends in a PR. */
export interface FixRun {
  id: string
  /** The worker preset's id. */
  worker: string
  model: string
  /** The branch the worktree is on: `standards/og-video`. */
  branch: string
  started_at: string
  /** Left out while it runs. */
  ms?: number
  state: 'running' | 'done' | 'failed' | 'stopped'
  /** The PR it opened. */
  pr?: { url: string; number: number; state: 'open' | 'merged' | 'closed' }
  cost_usd?: number
  transcript: TranscriptItem[]
}

/** A cell's state from its last result and waivers, as the engine works it out. */
export type CellState = 'pass' | 'pass-older' | 'fail' | 'error' | 'stale' | 'unchecked' | 'waived'

/** Work under way on a cell: a worker on it, or the PR it opened, until the check passes. */
export type CellRun = { state: 'running'; worker: string } | { state: 'pr-open'; url: string; number: number }

/** What a cell shows: `checking` while a check runs, else its run when one is under way, else its state. */
export type ShownState = CellState | CellRun['state'] | 'checking'

/** One asset × one item. */
export interface CellStatus {
  asset: string
  /** `pack/item` */
  item: string
  title: string
  state: CellState
  result?: Result
  waiver?: Waiver
  /** App-side: the run or PR under way. */
  run?: CellRun
  /** App-side: a check of the cell is under way. `state`, `result` and `run` stay as the last check left them, and coverage counts the cell as that state until the new result lands. */
  checking?: boolean
}

/** One check on a pull request, as `gh pr view --json statusCheckRollup` reports it. */
export interface PullRequestCheck {
  name: string
  /** A check run's status (`QUEUED`, `IN_PROGRESS`, `COMPLETED`) or a status context's state (`PENDING`, `SUCCESS`, `FAILURE`, `ERROR`). */
  state: string
  /** A finished check run's verdict: `SUCCESS`, `FAILURE`, `NEUTRAL`, `SKIPPED`, `CANCELLED`, `TIMED_OUT`, `ACTION_REQUIRED`; empty otherwise. */
  conclusion: string
}

/** A fix run's pull request, as `standards pr view` prints it (all of it from `gh pr view --json`). */
export interface PullRequest {
  number: number
  url: string
  title: string
  state: 'OPEN' | 'MERGED' | 'CLOSED'
  isDraft: boolean
  mergeable: 'MERGEABLE' | 'CONFLICTING' | 'UNKNOWN'
  /** GitHub's merge box state: `CLEAN`, `BLOCKED`, `BEHIND`, `DIRTY`, `UNSTABLE`, `DRAFT`, `HAS_HOOKS`, `UNKNOWN`. */
  mergeStateStatus: string
  /** `APPROVED`, `CHANGES_REQUESTED`, `REVIEW_REQUIRED`, or empty when the repo asks for no review. */
  reviewDecision: string
  checks: PullRequestCheck[]
  additions: number
  deletions: number
  changedFiles: number
  files: { path: string; additions: number; deletions: number }[]
  /** Markdown. */
  body: string
}

/** How `gh pr merge` merges. */
export type MergeMethod = 'merge' | 'squash' | 'rebase'

/** Who `gh` is signed in as, from `standards github status`. */
export interface GithubAuth {
  loggedIn: boolean
  user?: string
  /** The git protocol it pushes over: `https`, `ssh`. */
  protocol?: string
}
