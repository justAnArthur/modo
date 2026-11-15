/*!
 * Local addition: the AI app's mock data for the pages under pages/AI and
 * the AI blocks' docs examples. Everything here is made up; nothing talks to
 * a backend.
 */

import type {
  Artifact,
  BackgroundTask,
  Change,
  Check,
  Command,
  Hook,
  McpServer,
  MemoryFile,
  Model,
  PermissionMode,
  Plugin,
  Profile,
  Project,
  Session,
  SessionGroup,
  Worktree,
} from '../../blocks/AI/types'

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
      { label: 'Session (5h)', value: 0.42, detail: '42% · resets 16:20', windowHours: 5, resetsInHours: 2.3 },
      { label: 'Weekly, all models', value: 0.61, detail: '61% · resets Mon', windowHours: 168, resetsInHours: 20 },
      { label: 'Weekly, Opus', value: 0.78, detail: '78% · resets Mon', windowHours: 168, resetsInHours: 20 },
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
      { label: 'Session (5h)', value: 0.93, detail: '93% · resets 14:05', windowHours: 5, resetsInHours: 1.2 },
      { label: 'Weekly, all models', value: 0.4, detail: '40% · resets Thu', windowHours: 168, resetsInHours: 100 },
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
      { label: 'Session (5h)', value: 0.08, detail: '8% · resets 18:40', windowHours: 5, resetsInHours: 4.4 },
      { label: 'Weekly, all models', value: 0.22, detail: '22% · resets Sat', windowHours: 168, resetsInHours: 110 },
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
    limits: [
      { label: 'Prompts (5h)', value: 0.35, detail: '210 / 600 · resets 15:00', windowHours: 5, resetsInHours: 3 },
    ],
    running: 0,
  },
]

export const PINNED: Session[] = [
  {
    id: 'ai-app',
    title: 'Design the AI app',
    status: 'running',
    profile: 'jobiflow',
    updated: 'now',
    branch: 'claude/ai-app',
    pinned: true,
    project: 'modo',
    tasks: { done: 3, total: 6 },
    lastLine: 'Running bun run check',
    reply: 'The board now follows the sidebar: same groups, same glyphs. Typechecking before the narrow pass.',
    work: {
      summary: 'Working…',
      detail: '3 tool calls',
      tools: [
        { tool: 'Edit', summary: 'ui/blocks/AI/session-board/index.tsx', meta: '+214 −160' },
        { tool: 'Bash', summary: 'bunx tsc -p ui --noEmit' },
      ],
    },
  },
  {
    id: 'release-notes',
    title: 'Weekly release notes',
    status: 'idle',
    profile: 'work',
    updated: '2d',
    pinned: true,
    project: 'jobiflow-api',
    lastLine: 'Posted to #releases',
    reply: 'Posted the notes to #releases: 14 merged PRs, two of them breaking, each with its migration line.',
    work: {
      summary: 'Worked for 1m 12s',
      detail: '3 tool calls',
      tools: [
        { tool: 'Bash', summary: 'gh pr list --state merged --search "merged:>=2026-11-08"', meta: '14 PRs' },
        { tool: 'MCP', summary: 'slack · post_message #releases' },
      ],
    },
  },
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
        waitingOn: 'Permission · Bash: git worktree prune',
        tasks: { done: 4, total: 5 },
        reply: 'The pages tier renders on the canvas. The lib-canvas worktree is merged, so I want to prune it.',
        work: {
          summary: 'Worked for 2m 04s',
          detail: '11 tool calls · 1 agent',
          tools: [
            { tool: 'Edit', summary: 'lib/src/runtime/canvas/CanvasPage.tsx', meta: '+48 −12' },
            { tool: 'Bash', summary: 'git branch --merged main', meta: '3 branches' },
          ],
        },
        prompt: { kind: 'permission', tool: 'Bash', command: 'git worktree prune', rule: 'git worktree *' },
        children: [
          {
            id: 'canvas-zoom',
            title: 'Zoom controls follow the cursor',
            status: 'running',
            profile: 'jobiflow',
            updated: '1m',
            tasks: { done: 1, total: 4 },
            lastLine: 'Editing CanvasPage.tsx',
          },
          {
            id: 'canvas-docs',
            title: 'Document the canvas hooks',
            status: 'unread',
            profile: 'jobiflow',
            updated: '6m',
            lastLine: 'Added the canvas hooks to AGENTS.md',
          },
        ],
      },
      {
        id: 'meter',
        title: 'Add a Meter component',
        status: 'unread',
        profile: 'jobiflow',
        updated: '12m',
        lastLine: 'Meter is in, with bar and ring variants',
        reply:
          'Meter is in, with bar, line and ring variants. It turns amber at 80% and red at 95% unless told otherwise.',
        work: {
          summary: 'Worked for 4m 30s',
          detail: '18 tool calls',
          tools: [
            { tool: 'Write', summary: 'ui/components/meter/index.tsx', meta: '+186' },
            { tool: 'Bash', summary: 'bun run lint', meta: 'clean' },
          ],
        },
      },
      {
        id: 'parser',
        title: 'TSDoc parser drops @values',
        status: 'idle',
        profile: 'work-personal',
        updated: '1h',
        lastLine: 'Waiting for a repro',
      },
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
        tasks: { done: 2, total: 3 },
        lastLine: 'Running the webhook tests',
        reply: 'Retries now back off exponentially and stop after five attempts. Running the webhook tests.',
        work: {
          summary: 'Working…',
          detail: '7 tool calls',
          tools: [
            { tool: 'Edit', summary: 'src/billing/webhooks.ts', meta: '+31 −9' },
            { tool: 'Bash', summary: 'bun test webhooks' },
          ],
        },
      },
      {
        id: 'pg',
        title: 'Migrate to Postgres 17',
        status: 'waiting',
        profile: 'work',
        updated: '3h',
        waitingOn: 'Question · Run the migration on staging first?',
        reply: 'The migration script is ready and passes against a local Postgres 17. Where should it run first?',
        work: {
          summary: 'Worked for 3m 41s',
          detail: '9 tool calls',
          tools: [
            { tool: 'Write', summary: 'migrations/0042_pg17.sql', meta: '+64' },
            { tool: 'Bash', summary: 'docker compose run db-17 psql -f migrations/0042_pg17.sql', meta: 'ok' },
          ],
        },
        prompt: {
          kind: 'question',
          tag: 'Migration',
          question: 'Run the migration on staging first?',
          options: [
            { label: 'Staging first (Recommended)', description: 'Run it there, compare row counts, then production' },
            { label: 'Straight to production', description: 'In the next maintenance window' },
            { label: 'Dry run only', description: 'Print the plan and stop' },
          ],
        },
      },
    ],
  },
  {
    label: 'Review queue',
    kind: 'section',
    sessions: [
      {
        id: 'glm',
        title: 'Try GLM on the lint pass',
        status: 'idle',
        profile: 'zcode',
        updated: '1d',
        lastLine: 'Lint pass done, 3 fixes',
      },
      {
        id: 'a11y',
        title: 'Keyboard audit of the sidebar',
        status: 'unread',
        profile: 'work-personal',
        updated: '1d',
        lastLine: 'Found 2 focus traps',
      },
    ],
  },
]

export const ARCHIVED: Session[] = [
  { id: 'old-1', title: 'Port the toast component', status: 'idle', profile: 'jobiflow', updated: '2w' },
  { id: 'old-2', title: 'Bump UnoCSS to 66', status: 'idle', profile: 'jobiflow', updated: '3w' },
]

export const PROJECTS: Project[] = GROUPS.flatMap(g =>
  g.kind === 'project' && g.path ? [{ label: g.label, path: g.path }] : [],
)

export const BRANCHES = ['main', 'feat/v1-lib-fixes', 'refactor/clean-ds']

export const MODELS: Model[] = [
  { name: 'Opus 5.5', note: 'Most capable' },
  { name: 'Sonnet 5.5', note: 'Fast and capable' },
  { name: 'Haiku 5.5', note: 'Fastest, lightest' },
  { name: 'Fable 5.2', note: 'Long context' },
]
export const ZCODE_MODELS: Model[] = [
  { name: 'GLM-4.6', note: 'Z.ai flagship' },
  { name: 'GLM-4.5-Air', note: 'Z.ai, lighter' },
]
export const EFFORTS = ['Low', 'Medium', 'High', 'Extra high', 'Max']
export const PERMISSION_MODES: PermissionMode[] = [
  { label: 'Ask before edits', note: 'Asks before every edit and command', icon: 'shield-check' },
  { label: 'Accept edits', note: 'Edits freely, asks before commands', icon: 'pen-line' },
  { label: 'Plan mode', note: 'Reads and plans, changes nothing', icon: 'list-checks' },
  { label: 'Auto', note: 'Runs safe actions, asks for risky ones', icon: 'zap' },
  { label: 'Bypass permissions', note: 'Never asks; for sandboxes only', icon: 'triangle-alert' },
]
export const OUTPUT_STYLES = ['Default', 'Concise', 'Explanatory', 'Learning']

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

export const PR = {
  number: 23,
  title: 'feat(ui): AI app screens',
  branch: 'claude/ai-app-design',
  base: 'main',
  checks: [
    { name: 'lint', status: 'success', detail: '18s' },
    { name: 'check', status: 'success', detail: '1m 02s' },
    { name: 'test', status: 'failed', detail: 'parser › keeps @values' },
    { name: 'pages / build', status: 'running', detail: 'Building 5 design systems' },
  ] satisfies Check[],
  comments: 2,
}

export const ARTIFACTS: Artifact[] = [
  { title: 'AI app: screen map', kind: 'Page', updated: '10m' },
  { title: 'Profile usage this week', kind: 'Dashboard', updated: '1h' },
  { title: 'Settings IA', kind: 'Document', updated: 'Yesterday' },
]

export const TASKS: BackgroundTask[] = [
  { title: 'Explore: how pages render', kind: 'agent', status: 'done', detail: '14 tool uses · 38s' },
  { title: 'bun dev ui', kind: 'shell', status: 'running', detail: 'port 5173' },
  { title: 'Zoom controls follow the cursor', kind: 'session', status: 'running', detail: 'jobiflow · worktree' },
  { title: 'bun run test --watch', kind: 'shell', status: 'failed', detail: 'exit 1' },
]

export const MCP_SERVERS: McpServer[] = [
  {
    name: 'ai-app',
    transport: 'stdio',
    status: 'connected',
    tools: 4,
    scope: 'user',
    target: 'ai-app mcp',
    toolNames: ['approve_permission', 'open_pane', 'notify', 'hand_off'],
  },
  {
    name: 'github',
    transport: 'http',
    status: 'connected',
    tools: 38,
    scope: 'user',
    target: 'https://api.githubcopilot.com/mcp/',
    env: ['GITHUB_TOKEN'],
    toolNames: ['create_pull_request', 'get_issue', 'list_commits', 'search_code', 'merge_pull_request'],
  },
  {
    name: 'linear',
    transport: 'sse',
    status: 'needs-auth',
    tools: 0,
    scope: 'user',
    target: 'https://mcp.linear.app/sse',
    authHost: 'linear.app',
  },
  {
    name: 'postgres',
    transport: 'stdio',
    status: 'failed',
    tools: 0,
    scope: 'project',
    target: 'bunx @modelcontextprotocol/server-postgres $DATABASE_URL',
    env: ['DATABASE_URL'],
    error:
      'Error: connect ECONNREFUSED 127.0.0.1:5432\n    at TCPConnectWrap.afterConnect [as oncomplete]\nserver exited with code 1',
  },
  {
    name: 'vercel',
    transport: 'http',
    status: 'needs-auth',
    tools: 0,
    scope: 'plugin',
    target: 'https://mcp.vercel.com',
    authHost: 'vercel.com',
  },
]

export const HOOKS: Hook[] = [
  {
    event: 'PreToolUse',
    matcher: 'Bash',
    command: '~/.claude/hooks/guard-rm.sh',
    scope: 'user',
    timeout: 10,
    lastRun: { when: '2 min ago', exit: 0 },
  },
  {
    event: 'PostToolUse',
    matcher: 'Edit|Write',
    command: 'bunx biome format --write $FILE',
    scope: 'project',
    timeout: 30,
    lastRun: { when: '4 min ago', exit: 0 },
  },
  {
    event: 'Stop',
    matcher: '*',
    command: 'ai-app notify --sound',
    scope: 'user',
    lastRun: { when: '12 min ago', exit: 0 },
  },
  {
    event: 'SessionStart',
    matcher: 'startup',
    command: 'cat .claude/brief.md',
    scope: 'project',
    lastRun: { when: 'today 09:12', exit: 1 },
  },
]

export const PLUGINS: Plugin[] = [
  { name: 'modo-ui', description: 'Craft UI in the ui design system', kind: 'skill', enabled: true },
  { name: 'sparse', description: 'Right-sized, readable code', kind: 'skill', enabled: true },
  { name: 'gstack', description: 'Review, QA, ship and deploy workflows', kind: 'plugin', enabled: true },
  { name: 'vercel', description: 'Deployments, env vars and logs', kind: 'plugin', enabled: false },
  { name: 'Browser pane', description: 'Drive a built-in browser beside the chat', kind: 'plugin', enabled: false },
  { name: 'iOS simulator', description: 'Run and tap through iOS apps', kind: 'plugin', enabled: false },
]

export const MEMORY: MemoryFile[] = [
  { name: 'no-ai-coauthor', description: 'Never add AI attribution to commits or PRs', type: 'feedback' },
  { name: 'disk-hygiene', description: 'Work under ~/Projects, remove worktrees when done', type: 'feedback' },
  { name: 'modo-releases', description: 'Scoped commits publish lib and ui', type: 'project' },
  { name: 'arthur', description: 'Builds modo; prefers terse, token-only UI', type: 'user' },
]

export const WORKTREES: Worktree[] = [
  {
    path: '.claude/worktrees/ai-app',
    branch: 'claude/ai-app',
    session: 'Design the AI app',
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

export const FILES = [...CHANGES.map(c => c.path), 'ui/DESIGN.md', 'ui/AGENTS.md', 'lib/src/runtime/routes.tsx']

/** The session lists every sessions block takes: spread it, `<SessionSidebar {...SESSIONS} />`. */
export const SESSIONS = { pinned: PINNED, groups: GROUPS, archived: ARCHIVED, profiles: PROFILES }

/** What the composer's menus offer: spread it, `<Composer {...COMPOSER} />`. */
export const COMPOSER = {
  models: MODELS,
  efforts: EFFORTS,
  permissionModes: PERMISSION_MODES,
  outputStyles: OUTPUT_STYLES,
  commands: COMMANDS,
  files: FILES,
  projects: PROJECTS,
  branches: BRANCHES,
  profiles: PROFILES,
}
