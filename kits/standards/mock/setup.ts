/*!
 * Docs-only mock data for the setup forms: the Claude Code profiles on this
 * machine, the rules a worker is often allowed, a new business half filled
 * in, and the device code `gh auth login` prints.
 */

import type { Business, ClaudeProfile } from '../lib/types'

export const PROFILES: ClaudeProfile[] = [
  { configDir: '~/.claude', label: 'Personal', signedIn: true, account: 'arthur@example.com' },
  { configDir: '~/.claude-work', label: 'Work', signedIn: true, account: 'arthur@studio.example' },
  { configDir: '~/.claude-ci', label: 'CI', signedIn: false },
]

/** Rules the allowed-tools field offers before anything is typed. */
export const TOOL_SUGGESTIONS = [
  'Bash(git *)',
  'Bash(gh pr *)',
  'Bash(gh repo edit *)',
  'Bash(bun *)',
  'Bash(npm *)',
  'Bash(python3 -)',
  'WebFetch',
  'WebSearch',
]

/** A business being added: a site, and a repo not cloned yet. */
export const NEW_BUSINESS: Business = {
  id: 'northwind',
  name: 'Northwind',
  assets: [
    { id: 'site', kind: 'website', url: 'https://northwind.example', stack: 'astro' },
    { id: 'repo', kind: 'repo', repo: 'northwind/web' },
  ],
  packs: ['website', 'repo@1'],
  waivers: [],
}

export const DEVICE_CODE = '4F2A-9C1D'
