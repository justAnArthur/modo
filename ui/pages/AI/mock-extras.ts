/*!
 * Local addition: mock data for the AI app's onboarding, inbox, transcript
 * search, failure states and shortcuts. Everything here is made up; nothing
 * talks to a backend.
 */

import type { InboxItem } from '../../blocks/AI/inbox'
import type { SignInStatus } from '../../blocks/AI/profile-onboarding'
import type { ShortcutGroup } from '../../blocks/AI/shortcuts-sheet'
import type { TranscriptSession } from '../../blocks/AI/transcript-search'

const ESC = String.fromCharCode(27)
const dim = (s: string) => `${ESC}[2m${s}${ESC}[0m`
const green = (s: string) => `${ESC}[32m${s}${ESC}[0m`
const red = (s: string) => `${ESC}[31m${s}${ESC}[0m`

const LOGIN_URL = 'https://claude.ai/oauth/authorize?code=true&client_id=9d1c…&state=Qx7k…'

const LOGIN_START = [
  '$ CLAUDE_CONFIG_DIR=~/.claude-research claude login',
  dim('Using config dir ~/.claude-research (new)'),
  'Opening your browser to sign in…',
  dim(`If it did not open, visit: ${LOGIN_URL}`),
]

export const SIGN_IN_WAITING: SignInStatus = {
  state: 'waiting',
  url: LOGIN_URL,
  log: [...LOGIN_START, dim('Waiting for the browser…')],
}

export const SIGN_IN_SUCCESS: SignInStatus = {
  state: 'success',
  account: 'arthur@research.example',
  plan: 'Max 5×',
  log: [
    ...LOGIN_START,
    dim('Waiting for the browser…'),
    'Authorization code received',
    green('✓ Logged in as arthur@research.example (Max 5×)'),
    dim('Credentials saved to ~/.claude-research/.credentials.json'),
  ],
}

export const SIGN_IN_FAILED: SignInStatus = {
  state: 'failed',
  error: 'The browser window closed before the sign-in finished.',
  log: [
    ...LOGIN_START,
    dim('Waiting for the browser…'),
    red('✗ OAuth error: access_denied (the user closed the window)'),
    'Run claude login again to retry.',
  ],
}

export const PROVIDER_TEST_SUCCESS: SignInStatus = {
  state: 'success',
  plan: 'GLM-4.6 answered in 840 ms',
  log: [
    '$ curl -s $ANTHROPIC_BASE_URL/v1/messages -H "x-api-key: $ZAI_API_KEY" -d \'{"model":"GLM-4.6",…}\'',
    dim('POST https://api.z.ai/api/anthropic/v1/messages'),
    green('200 OK · 840 ms'),
    dim('{"type":"message","model":"GLM-4.6","content":[{"type":"text","text":"pong"}]}'),
  ],
}

export const INBOX: InboxItem[] = [
  {
    id: 'i-1',
    kind: 'permission',
    title: 'Run bun run check',
    sessionId: 'canvas',
    session: 'Canvas page and pages tier',
    project: 'modo',
    profile: 'jobiflow',
    detail: 'Bash · bun run build && bun run check',
    ago: 2,
  },
  {
    id: 'i-2',
    kind: 'question',
    title: 'Staging first, or straight to production?',
    sessionId: 'pg',
    session: 'Migrate to Postgres 17',
    project: 'jobiflow-api',
    profile: 'work',
    ago: 9,
  },
  {
    id: 'i-3',
    kind: 'rate-limit',
    title: 'work is at 93% of its 5-hour limit',
    sessionId: 'billing',
    session: 'Stripe webhook retries',
    project: 'jobiflow-api',
    profile: 'work',
    detail: 'Resets 14:05 · jobiflow has room',
    ago: 14,
  },
  {
    id: 'i-4',
    kind: 'ci-failed',
    title: 'check · typecheck failed on PR 412',
    sessionId: 'meter',
    session: 'Add a Meter component',
    project: 'modo',
    profile: 'jobiflow',
    detail: "ui/components/meter/index.tsx(88,7): Type 'string' is not assignable…",
    ago: 48,
  },
  {
    id: 'i-5',
    kind: 'plan',
    title: 'Plan: keyboard audit, 6 steps',
    sessionId: 'a11y',
    session: 'Keyboard audit of the sidebar',
    project: 'modo',
    profile: 'work-personal',
    ago: 130,
  },
  {
    id: 'i-6',
    kind: 'finished',
    title: 'Posted the notes to #releases',
    sessionId: 'release-notes',
    session: 'Weekly release notes',
    project: 'jobiflow-api',
    profile: 'work',
    ago: 300,
    read: true,
  },
  {
    id: 'i-7',
    kind: 'finished',
    title: 'The lint pass is clean on GLM-4.6',
    sessionId: 'glm',
    session: 'Try GLM on the lint pass',
    profile: 'zcode',
    ago: 60 * 26,
    read: true,
  },
]

export const TRANSCRIPTS: TranscriptSession[] = [
  {
    id: 'canvas',
    title: 'Canvas page and pages tier',
    project: '~/Projects/justanarthur/modo',
    profile: 'jobiflow',
    daysAgo: 0,
    messages: [
      {
        id: 'm-1',
        role: 'user',
        when: '13:58',
        text: 'Add a canvas page that shows every item at once.\nIt should pan and zoom like Figma.',
      },
      {
        id: 'm-2',
        role: 'assistant',
        when: '14:02',
        text: 'The canvas lays every frame out in columns by tier.\nZoom follows the cursor, so the point under it stays put.\nThe pages tier gets its own column at the end.',
      },
      {
        id: 'm-3',
        role: 'tool',
        when: '14:05',
        text: '$ bun run check\nui/blocks/canvas/index.tsx: zoom clamps to 0.1–4\nDone in 6.2s',
      },
    ],
  },
  {
    id: 'meter',
    title: 'Add a Meter component',
    project: '~/Projects/justanarthur/modo',
    profile: 'jobiflow',
    daysAgo: 1,
    messages: [
      { id: 'm-4', role: 'user', when: 'Sat', text: 'We need a meter for usage limits: bar and ring.' },
      {
        id: 'm-5',
        role: 'assistant',
        when: 'Sat',
        text: 'Meter takes a value and a max.\nPast warnAt it turns amber, past errorAt red.\nThe ring variant fits a sidebar row; zoom does not change its stroke.',
      },
    ],
  },
  {
    id: 'billing',
    title: 'Stripe webhook retries',
    project: '~/Projects/jobiflow/api',
    profile: 'work',
    daysAgo: 3,
    messages: [
      { id: 'm-6', role: 'user', when: 'Thu', text: 'Webhooks retry forever when the handler throws. Cap it.' },
      {
        id: 'm-7',
        role: 'assistant',
        when: 'Thu',
        text: 'Retries now back off exponentially and stop after 8 attempts.\nA failed event lands in the dead-letter table with its last error.',
      },
      {
        id: 'm-8',
        role: 'tool',
        when: 'Thu',
        text: '$ go test ./webhooks/...\nok  webhooks  1.84s\nPASS: TestRetryBackoff (8 attempts)',
      },
    ],
  },
  {
    id: 'glm',
    title: 'Try GLM on the lint pass',
    project: '~/Projects/justanarthur/modo',
    profile: 'zcode',
    daysAgo: 12,
    messages: [
      { id: 'm-9', role: 'user', when: 'Nov 3', text: 'Run the lint pass on GLM and compare.' },
      {
        id: 'm-10',
        role: 'assistant',
        when: 'Nov 3',
        text: 'GLM-4.6 found the same 14 issues.\nIt missed one retry loop in the zoom handler.',
      },
    ],
  },
]

export const CRASH_STDERR = [
  'node:internal/process/promises:394',
  '    triggerUncaughtException(err, true /* fromPromise */);',
  '    ^',
  '',
  red("Error: EMFILE: too many open files, watch '/Users/arthur/Projects/modo/ui'"),
  dim('    at FSWatcher.<computed> (node:internal/fs/watchers:247:19)'),
  dim('    at Object.watch (node:fs:2469:36)'),
  dim('    at startWatcher (file:///opt/claude/cli.js:4127:18)'),
  '',
  'Node.js v22.11.0',
]

export const SHORTCUTS: ShortcutGroup[] = [
  {
    label: 'Sessions',
    shortcuts: [
      { label: 'New session', keys: ['⌘N'] },
      { label: 'New session in another profile', keys: ['⇧⌘N'], keywords: ['profile'] },
      { label: 'Stop the turn', keys: ['Esc'], keywords: ['interrupt', 'cancel'] },
      { label: 'Rewind to a message', keys: ['Esc', 'Esc'], keywords: ['undo', 'back'] },
      { label: 'Archive session', keys: ['⌘⌫'] },
      { label: 'Search transcripts', keys: ['⇧⌘F'], keywords: ['find'] },
    ],
  },
  {
    label: 'Navigation',
    shortcuts: [
      { label: 'Command palette', keys: ['⌘K'], keywords: ['search'] },
      { label: 'Next session', keys: ['⌘]'] },
      { label: 'Previous session', keys: ['⌘['] },
      { label: 'Go to session 1–9', keys: ['⌘1'] },
      { label: 'Open the inbox', keys: ['G', 'I'], keywords: ['notifications'] },
      { label: 'Settings', keys: ['⌘,'] },
      { label: 'Keyboard shortcuts', keys: ['⌘/'], keywords: ['help'] },
    ],
  },
  {
    label: 'Composer',
    shortcuts: [
      { label: 'Send', keys: ['↵'] },
      { label: 'New line', keys: ['⇧↵'] },
      { label: 'Queue while it works', keys: ['⌘↵'], keywords: ['send'] },
      { label: 'Cycle permission mode', keys: ['⇧Tab'], keywords: ['plan', 'auto'] },
      { label: 'Mention a file', keys: ['@'] },
      { label: 'Slash command', keys: ['/'] },
      { label: 'Previous prompt', keys: ['↑'], keywords: ['history'] },
    ],
  },
  {
    label: 'Panes',
    shortcuts: [
      { label: 'Toggle sidebar', keys: ['⌘B'] },
      { label: 'Toggle side pane', keys: ['⌥⌘B'] },
      { label: 'Changes pane', keys: ['⌥⌘C'], keywords: ['diff'] },
      { label: 'Terminal pane', keys: ['⌃`'] },
      { label: 'Tasks pane', keys: ['⌥⌘T'] },
      { label: 'Focus the transcript', keys: ['⌘0'] },
    ],
  },
]
