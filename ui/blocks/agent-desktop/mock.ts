/*
 * Local addition: the agent desktop's mock data, shared by its blocks (as
 * their defaults) and the pages under pages/agent-desktop. Everything here is
 * made up; nothing talks to a backend.
 */

export interface UsageLimit {
  label: string
  /** Used share, 0–1. */
  value: number
  detail: string
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

export const PROFILES: Profile[] = [
  {
    id: 'jobiflow',
    name: 'jobiflow',
    configDir: '~/.claude-jobiflow',
    plan: 'Max 20×',
    provider: 'anthropic',
    account: 'Jobiflow',
    defaultModel: 'Opus 5.5',
    limits: [
      { label: 'Session (5h)', value: 0.42, detail: '42% · resets 16:20' },
      { label: 'Weekly, all models', value: 0.61, detail: '61% · resets Mon' },
      { label: 'Weekly, Opus', value: 0.78, detail: '78% · resets Mon' },
    ],
    running: 2,
  },
  {
    id: 'work',
    name: 'work',
    configDir: '~/.claude-work',
    plan: 'Team',
    provider: 'anthropic',
    account: 'Acme Corp',
    defaultModel: 'Sonnet 5.5',
    limits: [
      { label: 'Session (5h)', value: 0.93, detail: '93% · resets 14:05' },
      { label: 'Weekly, all models', value: 0.4, detail: '40% · resets Thu' },
    ],
    running: 1,
  },
  {
    id: 'work-personal',
    name: 'work-personal',
    configDir: '~/.claude-work-personal',
    plan: 'Pro',
    provider: 'anthropic',
    account: 'Personal',
    defaultModel: 'Sonnet 5.5',
    limits: [
      { label: 'Session (5h)', value: 0.08, detail: '8% · resets 18:40' },
      { label: 'Weekly, all models', value: 0.22, detail: '22% · resets Sat' },
    ],
    running: 0,
  },
  {
    id: 'zcode',
    name: 'zcode',
    configDir: '~/.claude-zcode',
    plan: 'GLM Coding Pro',
    provider: 'compatible',
    baseUrl: 'https://api.z.ai/api/anthropic',
    account: 'Z.ai',
    defaultModel: 'GLM-4.6',
    limits: [{ label: 'Prompts (5h)', value: 0.35, detail: '210 / 600 · resets 15:00' }],
    running: 0,
  },
]

export type SessionStatus = 'running' | 'waiting' | 'unread' | 'idle'

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
}

export interface SessionGroup {
  /** A project folder, or a section the user made. */
  label: string
  kind: 'project' | 'section'
  path?: string
  sessions: Session[]
}

export const PINNED: Session[] = [
  {
    id: 'agent-desktop',
    title: 'Design the agent desktop',
    status: 'running',
    profile: 'jobiflow',
    updated: 'now',
    branch: 'claude/agent-desktop',
    pinned: true,
  },
  { id: 'release-notes', title: 'Weekly release notes', status: 'idle', profile: 'work', updated: '2d', pinned: true },
]

export const GROUPS: SessionGroup[] = [
  {
    label: 'modo',
    kind: 'project',
    path: '~/Projects/justanarthur/modo',
    sessions: [
      {
        id: 'canvas',
        title: 'Canvas page and pages tier',
        status: 'waiting',
        profile: 'jobiflow',
        updated: '3m',
        branch: 'feat/lib-canvas',
        children: [
          {
            id: 'canvas-zoom',
            title: 'Zoom controls follow the cursor',
            status: 'running',
            profile: 'jobiflow',
            updated: '1m',
          },
          {
            id: 'canvas-docs',
            title: 'Document the canvas hooks',
            status: 'unread',
            profile: 'jobiflow',
            updated: '6m',
          },
        ],
      },
      { id: 'meter', title: 'Add a Meter component', status: 'unread', profile: 'jobiflow', updated: '12m' },
      { id: 'parser', title: 'TSDoc parser drops @values', status: 'idle', profile: 'work-personal', updated: '1h' },
    ],
  },
  {
    label: 'jobiflow-api',
    kind: 'project',
    path: '~/Projects/jobiflow/api',
    sessions: [
      {
        id: 'billing',
        title: 'Stripe webhook retries',
        status: 'running',
        profile: 'work',
        updated: 'now',
        branch: 'fix/webhook-retries',
      },
      { id: 'pg', title: 'Migrate to Postgres 17', status: 'idle', profile: 'work', updated: '3h' },
    ],
  },
  {
    label: 'Review queue',
    kind: 'section',
    sessions: [
      { id: 'glm', title: 'Try GLM on the lint pass', status: 'idle', profile: 'zcode', updated: '1d' },
      { id: 'a11y', title: 'Keyboard audit of the sidebar', status: 'unread', profile: 'work-personal', updated: '1d' },
    ],
  },
]

export const ARCHIVED: Session[] = [
  { id: 'old-1', title: 'Port the toast component', status: 'idle', profile: 'jobiflow', updated: '2w' },
  { id: 'old-2', title: 'Bump UnoCSS to 66', status: 'idle', profile: 'jobiflow', updated: '3w' },
]

export const MODELS = ['Opus 5.5', 'Sonnet 5.5', 'Haiku 5.5', 'Fable 5.2']
export const ZCODE_MODELS = ['GLM-4.6', 'GLM-4.5-Air']
export const EFFORTS = ['Low', 'Medium', 'High', 'Extra high', 'Max']
export const PERMISSION_MODES = ['Ask before edits', 'Accept edits', 'Plan mode', 'Auto', 'Bypass permissions']
export const OUTPUT_STYLES = ['Default', 'Concise', 'Explanatory', 'Learning']

export interface Command {
  name: string
  description: string
  kind: 'command' | 'skill' | 'plugin'
}

export const COMMANDS: Command[] = [
  { name: '/compact', description: 'Summarize the conversation to free context', kind: 'command' },
  { name: '/clear', description: 'Start over in this session', kind: 'command' },
  { name: '/model', description: 'Switch the model', kind: 'command' },
  { name: '/review', description: 'Review the current diff', kind: 'command' },
  { name: '/init', description: 'Write a CLAUDE.md for this repo', kind: 'command' },
  { name: '/modo-ui', description: 'Craft UI in the ui design system', kind: 'skill' },
  { name: '/sparse', description: 'Right-sized, readable code', kind: 'skill' },
  { name: '/graphify', description: 'Turn any input into a knowledge graph', kind: 'skill' },
  { name: '/ship', description: 'Merge, test, bump and open a PR', kind: 'plugin' },
  { name: '/usage-report', description: 'Usage across all profiles', kind: 'plugin' },
]

export interface Change {
  path: string
  status: 'added' | 'modified' | 'deleted'
  added: number
  removed: number
  patch: string
}

export const CHANGES: Change[] = [
  {
    path: 'ui/components/meter/index.tsx',
    status: 'added',
    added: 6,
    removed: 0,
    patch: `@@ -0,0 +1,6 @@
+const BAR_FILL: Record<MeterTone, string> = {
+  default: 'bg-muted-foreground',
+  warning: 'bg-status-warning',
+  error: 'bg-status-error',
+}
+`,
  },
  {
    path: 'ui/lib/icon-context.tsx',
    status: 'modified',
    added: 3,
    removed: 1,
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
    added: 1,
    removed: 1,
    patch: `@@ -25,3 +25,3 @@ const root = dirname(fileURLToPath(import.meta.url))
-const sources = resolve(root, '{lib,primitives,components,blocks}/**/*.{ts,tsx,mdx}')
+const sources = resolve(root, '{lib,primitives,components,blocks,pages}/**/*.{ts,tsx,mdx}')
 const chrome = resolve(root, 'modo.components.tsx')`,
  },
]

export const TERMINAL_LINES = [
  '$ bun run lint',
  'Checked 412 files in 1.2s. No fixes applied.',
  '$ bun run check',
  '@justanarthur/modo-ui check: tsc --noEmit',
  '@justanarthur/modo-ui check: Exited with code 0',
  '$ bun run test',
  ' 128 pass',
  ' 0 fail',
  'Ran 128 tests across 9 files. [1.84s]',
]

export interface Check {
  name: string
  status: 'success' | 'running' | 'failed'
  detail: string
}

export const PR = {
  number: 23,
  title: 'feat(ui): agent desktop screens',
  branch: 'claude/agent-desktop-design',
  base: 'main',
  checks: [
    { name: 'lint', status: 'success', detail: '18s' },
    { name: 'check', status: 'success', detail: '1m 02s' },
    { name: 'test', status: 'failed', detail: 'parser › keeps @values' },
    { name: 'pages / build', status: 'running', detail: 'Building 5 design systems' },
  ] satisfies Check[],
  comments: 2,
}

export interface Artifact {
  title: string
  kind: string
  updated: string
}

export const ARTIFACTS: Artifact[] = [
  { title: 'Agent desktop: screen map', kind: 'Page', updated: '10m' },
  { title: 'Profile usage this week', kind: 'Dashboard', updated: '1h' },
  { title: 'Settings IA', kind: 'Document', updated: 'Yesterday' },
]

export interface BackgroundTask {
  title: string
  kind: 'agent' | 'shell' | 'session'
  status: 'running' | 'done' | 'failed'
  detail: string
}

export const TASKS: BackgroundTask[] = [
  { title: 'Explore: how pages render', kind: 'agent', status: 'done', detail: '14 tool uses · 38s' },
  { title: 'bun dev ui', kind: 'shell', status: 'running', detail: 'port 5173' },
  { title: 'Zoom controls follow the cursor', kind: 'session', status: 'running', detail: 'jobiflow · worktree' },
  { title: 'bun run test --watch', kind: 'shell', status: 'failed', detail: 'exit 1' },
]

export interface McpServer {
  name: string
  transport: 'stdio' | 'http' | 'sse'
  status: 'connected' | 'needs-auth' | 'failed' | 'disabled'
  tools: number
  scope: 'user' | 'project' | 'plugin'
}

export const MCP_SERVERS: McpServer[] = [
  { name: 'agent-desktop', transport: 'stdio', status: 'connected', tools: 4, scope: 'user' },
  { name: 'github', transport: 'http', status: 'connected', tools: 38, scope: 'user' },
  { name: 'linear', transport: 'sse', status: 'needs-auth', tools: 0, scope: 'user' },
  { name: 'postgres', transport: 'stdio', status: 'failed', tools: 0, scope: 'project' },
  { name: 'vercel', transport: 'http', status: 'needs-auth', tools: 0, scope: 'plugin' },
]

export interface Hook {
  event: string
  matcher: string
  command: string
  scope: 'user' | 'project'
}

export const HOOKS: Hook[] = [
  { event: 'PreToolUse', matcher: 'Bash', command: '~/.claude/hooks/guard-rm.sh', scope: 'user' },
  { event: 'PostToolUse', matcher: 'Edit|Write', command: 'bunx biome format --write $FILE', scope: 'project' },
  { event: 'Stop', matcher: '*', command: 'agent-desktop notify --sound', scope: 'user' },
  { event: 'SessionStart', matcher: 'startup', command: 'cat .claude/brief.md', scope: 'project' },
]

export interface Plugin {
  name: string
  description: string
  kind: 'plugin' | 'skill'
  enabled: boolean
}

export const PLUGINS: Plugin[] = [
  { name: 'modo-ui', description: 'Craft UI in the ui design system', kind: 'skill', enabled: true },
  { name: 'sparse', description: 'Right-sized, readable code', kind: 'skill', enabled: true },
  { name: 'gstack', description: 'Review, QA, ship and deploy workflows', kind: 'plugin', enabled: true },
  { name: 'vercel', description: 'Deployments, env vars and logs', kind: 'plugin', enabled: false },
  { name: 'Browser pane', description: 'Drive a built-in browser beside the chat', kind: 'plugin', enabled: false },
  { name: 'iOS simulator', description: 'Run and tap through iOS apps', kind: 'plugin', enabled: false },
]

export interface MemoryFile {
  name: string
  description: string
  type: 'user' | 'feedback' | 'project' | 'reference'
}

export const MEMORY: MemoryFile[] = [
  { name: 'no-ai-coauthor', description: 'Never add AI attribution to commits or PRs', type: 'feedback' },
  { name: 'disk-hygiene', description: 'Work under ~/Projects, remove worktrees when done', type: 'feedback' },
  { name: 'modo-releases', description: 'Scoped commits publish lib and ui', type: 'project' },
  { name: 'arthur', description: 'Builds modo; prefers terse, token-only UI', type: 'user' },
]

export interface Worktree {
  path: string
  branch: string
  session: string
  size: string
  state: 'active' | 'merged' | 'stale'
}

export const WORKTREES: Worktree[] = [
  {
    path: '.claude/worktrees/agent-desktop',
    branch: 'claude/agent-desktop',
    session: 'Design the agent desktop',
    size: '1.2 GB',
    state: 'active',
  },
  {
    path: '.claude/worktrees/canvas-zoom',
    branch: 'claude/canvas-zoom',
    session: 'Zoom controls follow the cursor',
    size: '940 MB',
    state: 'active',
  },
  {
    path: '.worktrees/lib-canvas',
    branch: 'feat/lib-canvas',
    session: 'Canvas page and pages tier',
    size: '1.4 GB',
    state: 'merged',
  },
  {
    path: '.worktrees/old-toast',
    branch: 'feat/toast',
    session: 'Port the toast component',
    size: '880 MB',
    state: 'stale',
  },
]
