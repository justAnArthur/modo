/*!
 * Local addition: the side pane's mock data — the session's changed files,
 * an open file, a shell history, a pull request with its checks and
 * reviews, artifacts and background tasks.
 */

export interface PaneChange {
  path: string
  status: 'added' | 'modified' | 'deleted'
  staged: boolean
  patch: string
}

export const PANE_CHANGES: PaneChange[] = [
  {
    path: 'ui/components/meter/index.tsx',
    status: 'modified',
    staged: true,
    patch: `@@ -12,9 +12,11 @@ import { cn } from '../../lib/utils'
 type MeterTone = 'default' | 'warning' | 'error'

 const BAR_FILL: Record<MeterTone, string> = {
-  default: 'bg-foreground',
+  default: 'bg-muted-foreground',
   warning: 'bg-status-warning',
   error: 'bg-status-error',
 }

-function toneOf(share: number, warnAt: number, errorAt: number): MeterTone {
+// The track is bg-active, so the bar reads on any surface level, light or dark.
+function toneOf(share: number, warnAt = 0.8, errorAt = 0.95): MeterTone {
   if (share >= errorAt) return 'error'`,
  },
  {
    path: 'ui/lib/icon-context.tsx',
    status: 'modified',
    staged: true,
    patch: `@@ -208,4 +208,6 @@ export const defaultIcons = {
   folder: Folder,
-  'sliders-horizontal': SlidersHorizontal,
+  'sliders-horizontal': SlidersHorizontal,
+  terminal: Terminal,
+  'git-branch': GitBranch,
 }`,
  },
  {
    path: 'ui/uno.config.ts',
    status: 'modified',
    staged: false,
    patch: `@@ -25,3 +25,3 @@ const root = dirname(fileURLToPath(import.meta.url))
-const sources = resolve(root, '{lib,primitives,components,blocks}/**/*.{ts,tsx,mdx}')
+const sources = resolve(root, '{lib,primitives,components,blocks,pages}/**/*.{ts,tsx,mdx}')
 const chrome = resolve(root, 'modo.components.tsx')`,
  },
  {
    path: 'ui/blocks/agent-desktop/pace.ts',
    status: 'added',
    staged: false,
    patch: `@@ -0,0 +1,6 @@
+/** \`free\`: lasts past the reset at this pace; \`watch\`: only just; \`tight\`: runs out before it. */
+export type Verdict = 'free' | 'watch' | 'tight'
+
+/** Projected share from which a limit counts as only just lasting. */
+const WATCH_AT = 0.95
+const MIN_ELAPSED = 0.1`,
  },
  {
    path: 'ui/blocks/agent-desktop/usage-bars.tsx',
    status: 'deleted',
    staged: false,
    patch: `@@ -1,4 +0,0 @@
-export function UsageBars({ limits }: { limits: UsageLimit[] }) {
-  return limits.map(limit => <Meter key={limit.label} {...limit} />)
-}
-`,
  },
]

export const PANE_FILE = {
  path: 'ui/components/meter/index.tsx',
  language: 'tsx',
  source: `type MeterTone = 'default' | 'warning' | 'error'

const BAR_FILL: Record<MeterTone, string> = {
  default: 'bg-muted-foreground',
  warning: 'bg-status-warning',
  error: 'bg-status-error',
}

// The track is bg-active, so the bar reads on any surface level, light or dark.
function toneOf(share: number, warnAt = 0.8, errorAt = 0.95): MeterTone {
  if (share >= errorAt) return 'error'
  if (share >= warnAt) return 'warning'
  return 'default'
}`,
}

export interface ShellEntry {
  command: string
  output: string[]
  /** Non-zero when the command failed. Defaults to 0. */
  exit?: number
}

export const SHELL = {
  name: 'zsh',
  cwd: '~/Projects/justanarthur/modo',
  prompt: 'modo',
  history: [
    { command: 'bun run lint', output: ['Checked 412 files in 1.2s. No fixes applied.'] },
    {
      command: 'bun run check',
      output: ['@justanarthur/modo-ui check: tsc --noEmit', '@justanarthur/modo-ui check: Exited with code 0'],
    },
    {
      command: 'bun run test',
      output: [' 127 pass', ' 1 fail', 'parser › keeps @values', 'Ran 128 tests across 9 files. [1.84s]'],
      exit: 1,
    },
  ] satisfies ShellEntry[],
}

export interface PaneCheck {
  name: string
  status: 'success' | 'running' | 'failed'
  /** The run time, or what it is doing while it runs. */
  detail: string
  /** The tail of the check's log. */
  log: string
}

export interface Review {
  author: string
  where: string
  body: string
}

export const PULL_REQUEST = {
  number: 23,
  title: 'feat(ui): agent desktop screens',
  branch: 'claude/agent-desktop-design',
  base: 'main',
  checks: [
    {
      name: 'test',
      status: 'failed',
      detail: '41s',
      log: `parser › keeps @values
  Expected: ["sm", "md", "lg"]
  Received: undefined

    at lib/src/plugins/tsdoc.test.ts:88:31

 127 pass
 1 fail`,
    },
    {
      name: 'pages / build',
      status: 'running',
      detail: 'Building 5 design systems',
      log: `▸ demo: building filled, shadcn, fluid-functionalism
▸ demo: building mui
▸ demo: building ui`,
    },
    { name: 'lint', status: 'success', detail: '18s', log: 'Checked 412 files in 1.2s. No fixes applied.' },
    {
      name: 'check',
      status: 'success',
      detail: '1m 02s',
      log: `@justanarthur/modo check: tsc --noEmit
@justanarthur/modo-ui check: tsc --noEmit
Exited with code 0`,
    },
  ] satisfies PaneCheck[],
  reviews: [
    { author: 'mira', where: 'side-pane/panes.tsx:42', body: 'Can the commit field remember a draft?' },
    { author: 'jon', where: 'pace-bar.tsx:31', body: 'The tick reads well; keep it.' },
  ] satisfies Review[],
}

export type ArtifactKind = 'page' | 'dashboard' | 'document' | 'diagram'

export interface PaneArtifact {
  title: string
  kind: ArtifactKind
  updated: string
}

export const PANE_ARTIFACTS: PaneArtifact[] = [
  { title: 'Agent desktop: screen map', kind: 'diagram', updated: '10m' },
  { title: 'Profile usage this week', kind: 'dashboard', updated: '1h' },
  { title: 'Settings IA', kind: 'document', updated: 'Yesterday' },
  { title: 'Side pane review', kind: 'page', updated: '2d' },
]

export interface PaneTask {
  id: string
  title: string
  kind: 'agent' | 'shell' | 'session'
  status: 'running' | 'done' | 'failed' | 'stopped'
  detail: string
}

export const PANE_TASKS: PaneTask[] = [
  { id: 'dev', title: 'bun dev ui', kind: 'shell', status: 'running', detail: 'port 5173 · 14m' },
  {
    id: 'zoom',
    title: 'Zoom controls follow the cursor',
    kind: 'session',
    status: 'running',
    detail: 'jobiflow · worktree',
  },
  { id: 'watch', title: 'bun run test --watch', kind: 'shell', status: 'failed', detail: 'Exited with code 1' },
  { id: 'explore', title: 'Explore: how pages render', kind: 'agent', status: 'done', detail: '14 tool uses · 38s' },
]
