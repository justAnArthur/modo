/*!
 * Docs-only mock data: the pull requests the fix runs opened, as `standards
 * pr view` prints them: og:video open and green, then merged; the security
 * headers with a failing check, then conflicting; and a draft.
 */

import type { PullRequest } from '../lib/types'

const OG_VIDEO_BODY = `Points \`og:video\` at the hero loop, so link previews on LinkedIn and X can play it instead of a still.

- \`generateMetadata\` adds \`openGraph.videos\`: \`/media/hero-loop.mp4\`, \`video/mp4\`, 1280×720
- \`metadataBase\` already makes the URL absolute

Checked on a local build: the home page carries all four \`og:video\` tags.

Fixes \`website/og-video\`.`

/** sonnet-fixer's og:video PR: open, approved, every check green. */
export const OG_VIDEO_PR: PullRequest = {
  number: 24,
  url: 'https://github.com/camasys/web/pull/24',
  title: 'feat(seo): og:video for link previews',
  state: 'OPEN',
  isDraft: false,
  mergeable: 'MERGEABLE',
  mergeStateStatus: 'CLEAN',
  reviewDecision: 'APPROVED',
  checks: [
    { name: 'build', state: 'COMPLETED', conclusion: 'SUCCESS' },
    { name: 'lint', state: 'COMPLETED', conclusion: 'SUCCESS' },
    { name: 'Vercel – camasys-web', state: 'SUCCESS', conclusion: '' },
    { name: 'e2e (chromium)', state: 'COMPLETED', conclusion: 'SKIPPED' },
  ],
  additions: 1,
  deletions: 0,
  changedFiles: 1,
  files: [{ path: 'src/app/(frontend)/layout.tsx', additions: 1, deletions: 0 }],
  body: OG_VIDEO_BODY,
}

/** The same PR once merged. */
export const OG_VIDEO_MERGED: PullRequest = { ...OG_VIDEO_PR, state: 'MERGED', mergeable: 'UNKNOWN' }

/** The security headers PR: lint fails, the preview is still building. */
export const HEADERS_PR: PullRequest = {
  number: 25,
  url: 'https://github.com/camasys/web/pull/25',
  title: 'fix(security): X-Content-Type-Options on every path',
  state: 'OPEN',
  isDraft: false,
  mergeable: 'MERGEABLE',
  mergeStateStatus: 'UNSTABLE',
  reviewDecision: 'REVIEW_REQUIRED',
  checks: [
    { name: 'build', state: 'COMPLETED', conclusion: 'SUCCESS' },
    { name: 'lint', state: 'COMPLETED', conclusion: 'FAILURE' },
    { name: 'Vercel – camasys-web', state: 'PENDING', conclusion: '' },
  ],
  additions: 4,
  deletions: 1,
  changedFiles: 2,
  files: [
    { path: 'next.config.ts', additions: 3, deletions: 0 },
    { path: 'src/middleware.ts', additions: 1, deletions: 1 },
  ],
  body: 'Adds `X-Content-Type-Options: nosniff` for every path in `headers()`. HSTS already comes from Vercel.\n\nFixes `website/security-headers`.',
}

/** The security headers PR after main moved under it. */
export const HEADERS_CONFLICT: PullRequest = {
  ...HEADERS_PR,
  mergeable: 'CONFLICTING',
  mergeStateStatus: 'DIRTY',
  checks: HEADERS_PR.checks.map(check => ({ ...check, state: 'COMPLETED', conclusion: 'SUCCESS' })),
}

/** A draft with no description and no checks yet. */
export const DRAFT_PR: PullRequest = {
  number: 26,
  url: 'https://github.com/camasys/web/pull/26',
  title: 'docs: README with a banner and the setup steps',
  state: 'OPEN',
  isDraft: true,
  mergeable: 'MERGEABLE',
  mergeStateStatus: 'DRAFT',
  reviewDecision: '',
  checks: [],
  additions: 38,
  deletions: 4,
  changedFiles: 1,
  files: [{ path: 'README.md', additions: 38, deletions: 4 }],
  body: '',
}
