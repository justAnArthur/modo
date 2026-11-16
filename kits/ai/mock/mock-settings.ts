/*!
 * Local addition: the settings page's own mock data — its sections, the
 * notification settings and the installed extensions, which mock.ts doesn't
 * hold.
 */

import type { Extension } from '../blocks/settings/extensions'
import type { NotificationGroup } from '../blocks/settings/notifications'
import type { SettingsWindowSection } from '../blocks/settings/settings-window'

export const SETTINGS_SECTIONS: SettingsWindowSection[] = [
  { id: 'mcp', label: 'MCP servers', icon: 'plug', scoped: true, keywords: 'tools auth authenticate env url' },
  { id: 'hooks', label: 'Hooks', icon: 'webhook', scoped: true, keywords: 'events commands pretooluse stop' },
  {
    id: 'permissions',
    label: 'Permissions',
    icon: 'shield',
    scoped: true,
    keywords: 'allow ask deny rules mode directories',
  },
  { id: 'plugins', label: 'Skills and plugins', icon: 'package', scoped: true, keywords: 'catalog browser simulator' },
  { id: 'memory', label: 'Memory', icon: 'book-open', scoped: true, keywords: 'auto memory.md remember' },
  { id: 'worktrees', label: 'Worktrees', icon: 'git-fork', scoped: false, keywords: 'disk clean up branches' },
  { id: 'notifications', label: 'Notifications', icon: 'bell', scoped: false, keywords: 'sound awake alerts ci' },
  { id: 'extensions', label: 'Extensions', icon: 'puzzle', scoped: false, keywords: 'panes commands actions' },
]

export const WORKTREES_ON_DISK = '4.4 GB'

export const NOTIFICATIONS: NotificationGroup[] = [
  {
    title: 'Notify me when',
    settings: [
      {
        id: 'input',
        label: 'A session needs input',
        description: 'Permissions, questions and plans waiting on you',
        enabled: true,
      },
      { id: 'turn', label: 'A turn finishes', description: 'When a session wraps up with a next step', enabled: true },
      {
        id: 'ci',
        label: 'CI changes on a watched PR',
        description: 'Checks fail, pass or get review comments',
        enabled: false,
      },
    ],
  },
  {
    title: 'Behavior',
    settings: [
      { id: 'sound', label: 'Sound', description: 'A short chime with each notification', enabled: false },
      {
        id: 'awake',
        label: 'Keep the Mac awake',
        description: 'While any session is running, so long turns finish',
        enabled: true,
      },
    ],
  },
]

export const EXTENSIONS: Extension[] = [
  {
    name: 'Usage pane',
    kind: 'Pane',
    source: 'ai-app MCP server',
    description: 'Limits across every profile, in the side pane',
    enabled: true,
  },
  {
    name: '/usage-report',
    kind: 'Command',
    source: 'usage plugin',
    description: 'A weekly usage summary as an artifact',
    enabled: true,
  },
  {
    name: 'Hand off to zcode',
    kind: 'Action',
    source: 'ai-app MCP server',
    description: 'Continue a session under the GLM profile',
    enabled: true,
  },
  {
    name: 'notify on Stop',
    kind: 'Hook',
    source: '~/.claude/settings.json',
    description: 'Native notification when a turn ends',
    enabled: true,
  },
]
