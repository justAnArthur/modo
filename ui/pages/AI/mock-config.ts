/*!
 * Local addition: mock data for the AI app's config forms — an MCP server
 * being edited and its connection tests, a hook, the permission rules, and
 * the plugin catalog.
 */

import type { HookConfig } from '../../blocks/AI/hook-dialog'
import type { McpConnectionTest, McpServerConfig } from '../../blocks/AI/mcp-server-dialog'
import type { PermissionSettings } from '../../blocks/AI/permission-rules'
import type { CatalogPlugin } from '../../blocks/AI/plugin-catalog'

export const MCP_TAKEN = ['ai-app', 'github', 'linear', 'postgres']

export const MCP_POSTGRES: McpServerConfig = {
  name: 'postgres',
  transport: 'stdio',
  command: 'npx',
  args: ['-y', '@modelcontextprotocol/server-postgres'],
  env: [
    { key: 'DATABASE_URL', value: 'postgres://app@localhost:5432/app', secret: true },
    { key: 'PGSSLMODE', value: 'disable' },
  ],
  url: '',
  headers: [],
  scope: 'project',
  profiles: ['work'],
}

export const MCP_LINEAR: Partial<McpServerConfig> = {
  name: 'linear-staging',
  transport: 'http',
  url: 'https://mcp.linear.app/mcp',
  headers: [{ key: 'Authorization', value: 'Bearer lin_test_0000', secret: true }],
  scope: 'user',
}

export const MCP_TEST_TESTING: McpConnectionTest = { state: 'testing' }

export const MCP_TEST_OK: McpConnectionTest = {
  state: 'ok',
  tools: ['query', 'list_tables', 'describe_table', 'explain'],
}

export const MCP_TEST_FAILED: McpConnectionTest = {
  state: 'failed',
  error:
    'Error: connect ECONNREFUSED 127.0.0.1:5432\n    at TCPConnectWrap.afterConnect [as oncomplete] (node:net:1555:16)\nserver exited with code 1',
}

export const HOOK_LINT: HookConfig = {
  event: 'PostToolUse',
  matcher: 'Edit|Write',
  command: 'bun run lint --fix "$CLAUDE_PROJECT_DIR"',
  timeout: 30,
  scope: 'project',
}

export const HOOK_GUARD: HookConfig = {
  event: 'PreToolUse',
  matcher: 'Bash',
  command: "jq -r '.tool_input.command' | grep -qE 'rm -rf|git push --force' && exit 2 || exit 0",
  timeout: 10,
  scope: 'user',
}

export const PERMISSIONS: PermissionSettings = {
  mode: 'acceptEdits',
  rules: [
    { rule: 'Bash(bun run *)', behavior: 'allow', scope: 'project' },
    { rule: 'Bash(git status)', behavior: 'allow', scope: 'user' },
    { rule: 'Edit(ui/**)', behavior: 'allow', scope: 'project' },
    { rule: 'WebFetch(domain:github.com)', behavior: 'allow', scope: 'user' },
    { rule: 'mcp__github', behavior: 'allow', scope: 'local' },
    { rule: 'Bash(git push *)', behavior: 'ask', scope: 'project' },
    { rule: 'WebFetch', behavior: 'ask', scope: 'user' },
    { rule: 'Read(.env*)', behavior: 'deny', scope: 'project' },
    { rule: 'Bash(rm -rf *)', behavior: 'deny', scope: 'user' },
  ],
  directories: ['../modo-docs', '~/Projects/shared/tokens'],
}

export const CATALOG: CatalogPlugin[] = [
  {
    id: 'commit-commands',
    name: 'commit-commands',
    author: 'Anthropic',
    marketplace: 'claude-plugins-official',
    description: 'Commit, push and open a pull request in one command, with messages written from the diff.',
    category: 'Git',
    version: '1.4.0',
    installed: '1.4.0',
    readme:
      '# commit-commands\n\nThree commands for the end of a change:\n\n- `/commit` writes a conventional message from the staged diff.\n- `/commit-push-pr` commits, pushes and opens a PR.\n- `/clean-gone` deletes local branches whose remote is gone.\n\nNothing is pushed without your go-ahead.',
    contents: [
      { kind: 'command', name: '/commit', description: 'A commit from the staged diff' },
      { kind: 'command', name: '/commit-push-pr', description: 'Commit, push and open a PR' },
      { kind: 'command', name: '/clean-gone', description: 'Delete branches whose remote is gone' },
    ],
  },
  {
    id: 'pr-review-toolkit',
    name: 'pr-review-toolkit',
    author: 'Anthropic',
    marketplace: 'claude-plugins-official',
    description: 'Specialised review agents for comments, tests, error handling, types and simplification.',
    category: 'Code review',
    version: '2.1.0',
    installed: '2.0.3',
    readme:
      '# pr-review-toolkit\n\nRun `/review-pr` on a branch and six agents read the diff in parallel, each for one kind of problem. Findings come back ranked, with the file and line.\n\n## Agents\n\n| Agent | Looks for |\n| --- | --- |\n| comment-analyzer | stale or wrong comments |\n| silent-failure-hunter | swallowed errors |\n| type-design-analyzer | weak invariants |',
    contents: [
      { kind: 'command', name: '/review-pr', description: 'Review the current branch' },
      { kind: 'agent', name: 'comment-analyzer' },
      { kind: 'agent', name: 'silent-failure-hunter' },
      { kind: 'agent', name: 'type-design-analyzer' },
      { kind: 'skill', name: 'review-checklist', description: 'What a reviewer checks first' },
    ],
  },
  {
    id: 'playwright',
    name: 'playwright',
    author: 'Microsoft',
    marketplace: 'claude-plugins-official',
    description: 'Drive a real browser: navigate, click, fill forms, take screenshots and read the console.',
    category: 'Testing',
    version: '0.9.2',
    readme:
      '# playwright\n\nAn MCP server over Playwright. Sessions get tools to open pages, act on them by accessibility snapshot and capture what they see.\n\n```sh\nnpx @playwright/mcp@latest\n```',
    contents: [
      { kind: 'mcp', name: 'playwright', description: '22 tools: navigate, click, type, snapshot, screenshot…' },
      { kind: 'skill', name: 'e2e-testing', description: 'When and how to write a browser test' },
    ],
  },
  {
    id: 'security-guidance',
    name: 'security-guidance',
    author: 'Anthropic',
    marketplace: 'claude-plugins-official',
    description: 'A hook that warns before an edit introduces injection, unsafe deserialisation or secrets.',
    category: 'Security',
    version: '1.0.1',
    readme:
      '# security-guidance\n\nA PreToolUse hook on Edit and Write. It checks the new text for common footguns and, when it finds one, tells Claude why before the edit lands.',
    contents: [{ kind: 'hook', name: 'PreToolUse · Edit|Write', description: 'Pattern checks on new code' }],
  },
  {
    id: 'frontend-design',
    name: 'frontend-design',
    author: 'Anthropic',
    marketplace: 'claude-plugins-official',
    description: 'A skill for distinctive, production-grade interfaces that avoid the generic look.',
    category: 'Design',
    version: '1.2.0',
    readme:
      '# frontend-design\n\nLoads when a task asks for UI. It pushes for a clear aesthetic direction, real typography and motion with a purpose.',
    contents: [{ kind: 'skill', name: 'frontend-design' }],
  },
  {
    id: 'sentry',
    name: 'sentry',
    author: 'Sentry',
    marketplace: 'acme-internal',
    description: 'Look up issues and traces, and fix the top error of a release from its stack trace.',
    category: 'Observability',
    version: '0.4.0',
    readme:
      '# sentry\n\nConnects the Sentry MCP server and adds `/fix-top-issue`, which pulls the most frequent error of the latest release and starts a fix.',
    contents: [
      { kind: 'mcp', name: 'sentry', description: 'Issues, events, traces and releases' },
      { kind: 'command', name: '/fix-top-issue', description: 'Fix the latest release’s top error' },
    ],
  },
]
