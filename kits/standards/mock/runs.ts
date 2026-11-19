/*!
 * Docs-only mock data, invented around the real results: what the checks
 * recorded (Camasys's og:video request and its four failing assertions, the
 * hero check's model session, the sitemap script's output, the security
 * headers), earlier checks, and two fix runs: sonnet-fixer's finished og:video
 * run that ended in a PR, and its run on the security headers, still going.
 */

import { cellKey } from '../lib/cells'
import type { AssertionLog, CellStatus, FixRun, Result, ResultLog, TranscriptItem } from '../lib/types'
import { historyOf, statusOf } from './status'

const SITE = 'https://www.camasys.com/'

const missing = (target: string, expected: string): AssertionLog => ({ target, expected, pass: false })

const OG_VIDEO_FAIL: ResultLog = {
  kind: 'http',
  requests: [
    {
      url: SITE,
      status: 200,
      ms: 162,
      assertions: [
        missing('meta[property="og:video"] @content', 'an absolute URL answering 200 video/mp4, at most 8 MB'),
        missing('meta[property="og:video:type"] @content', 'equals video/mp4'),
        missing('meta[property="og:video:width"] @content', 'exists'),
        missing('meta[property="og:video:height"] @content', 'exists'),
      ],
    },
  ],
}

const OG_VIDEO_PASS: ResultLog = {
  kind: 'http',
  requests: [
    {
      url: SITE,
      status: 200,
      ms: 171,
      assertions: [
        {
          target: 'meta[property="og:video"] @content',
          expected: 'an absolute URL answering 200 video/mp4, at most 8 MB',
          actual: 'https://www.camasys.com/media/hero-loop.mp4 → 200 video/mp4, 2.4 MB',
          pass: true,
        },
        {
          target: 'meta[property="og:video:type"] @content',
          expected: 'equals video/mp4',
          actual: 'video/mp4',
          pass: true,
        },
        { target: 'meta[property="og:video:width"] @content', expected: 'exists', actual: '1280', pass: true },
        { target: 'meta[property="og:video:height"] @content', expected: 'exists', actual: '720', pass: true },
      ],
    },
  ],
}

const HEADERS_FAIL: ResultLog = {
  kind: 'http',
  requests: [
    {
      url: SITE,
      status: 200,
      ms: 79,
      assertions: [
        {
          target: 'header strict-transport-security',
          expected: 'matches max-age=\\d{7,}',
          actual: 'max-age=63072000; includeSubDomains; preload',
          pass: true,
        },
        missing('header x-content-type-options', 'equals nosniff'),
      ],
    },
  ],
}

const SITEMAP_SCRIPT: ResultLog = {
  kind: 'script',
  file: 'check.ts',
  lines: [
    'GET https://www.camasys.com/sitemap.xml → \u001b[32m200\u001b[0m application/xml',
    '431 URLs in 1 sitemap, sampling 20',
    ...[
      '/',
      '/pricing',
      '/features/fleet',
      '/features/bookings',
      '/features/payments',
      '/integrations',
      '/blog/subscription-cars',
      '/blog/leasing-vs-rental',
      '/case-studies/rentio',
      '/contact',
    ].map(path => `\u001b[32m200\u001b[0m https://www.camasys.com${path}`),
    '\u001b[2m… 10 more, all 200\u001b[0m',
    'every sampled URL answered 200 on www.camasys.com',
  ],
}

const HERO_PROMPT = `You judge one standard for one asset. Look, don't change anything.
Standard: The first screen says what it is, for whom, and what to do. Why it matters: visitors and AI summaries decide from the first screen; a vague hero loses both
Asset: site (website, payload-next)
URL: https://www.camasys.com

Fetch the home page at the URL above and read its first screen: the main heading, the line under it, and the primary button or link.
Pass only if a stranger could tell from those alone (1) what the product or company is, (2) who it is for, and (3) what to do next.
Fail when any of the three is missing, or only implied through jargon or slogans. Quote the heading in your evidence and name what is missing.

Answer pass or fail, and evidence in one or two sentences a person can verify.`

const HERO_EVIDENCE = statusOf('camasys', 'site', 'website/hero').result!.evidence

const HERO_TRANSCRIPT: TranscriptItem[] = [
  { kind: 'user', id: 'h1', text: HERO_PROMPT },
  {
    kind: 'thinking',
    id: 'h2',
    text: 'I need the first screen verbatim: the H1, the subheading and the primary call to action. WebFetch returns a summary, so I will ask it for those three exactly.',
  },
  {
    kind: 'tool',
    id: 'h3',
    name: 'WebFetch',
    input: {
      url: 'https://www.camasys.com',
      prompt:
        'Quote the first screen verbatim: the main heading (H1), the line under it, and the primary button or link.',
    },
    result: [
      'Main heading (H1): "Car rental management software for all kinds of mobility variants with immediate results."',
      'Line under it: "One system for car rental, car subscription and leasing companies: fleet, bookings, contracts and payments."',
      'Primary button: "Book a demo" (links to /contact). A secondary link reads "See pricing".',
    ].join('\n'),
    ms: 6_420,
  },
  {
    kind: 'text',
    id: 'h4',
    text: `**pass**\n\n${HERO_EVIDENCE}`,
  },
]

const HERO_LOG: ResultLog = { kind: 'ai', model: 'haiku', transcript: HERO_TRANSCRIPT }

const fixPrompt = (item: string, title: string, why: string, evidence: string) => `Fix one failing standard for Camasys.

Asset: site (website, payload-next), https://www.camasys.com
Worktree: ~/Projects/camasys/web/.worktrees/std-${item}, on branch standards/${item}
Standard: ${title} (website/${item} v1)
Why: ${why}
Failing: ${evidence}

House rules: work only in this worktree; one conventional commit; no AI attribution trailers or footers; open the PR with \`gh pr create\`; print its URL last.`

const LAYOUT_BEFORE = `  openGraph: {
    type: 'website',
    siteName: 'Camasys',
    images: [{ url: '/media/og-home.png', width: 1200, height: 630 }],
  },`

const LAYOUT_AFTER = `  openGraph: {
    type: 'website',
    siteName: 'Camasys',
    images: [{ url: '/media/og-home.png', width: 1200, height: 630 }],
    videos: [{ url: '/media/hero-loop.mp4', type: 'video/mp4', width: 1280, height: 720 }],
  },`

const OG_VIDEO_EVIDENCE = statusOf('camasys', 'site', 'website/og-video').result!.evidence

const OG_VIDEO_TRANSCRIPT: TranscriptItem[] = [
  {
    kind: 'user',
    id: 'f1',
    text: fixPrompt(
      'og-video',
      'og:video on the home page',
      'link previews on LinkedIn and X can play a short loop instead of a still, which gets more clicks',
      OG_VIDEO_EVIDENCE,
    ),
  },
  {
    kind: 'thinking',
    id: 'f2',
    text: 'A Next.js app on Payload: the meta tags come from generateMetadata. Find where the home page sets openGraph, and whether the repo already has a short video to point at.',
  },
  {
    kind: 'tool',
    id: 'f3',
    name: 'Grep',
    input: { pattern: 'generateMetadata', path: 'src/app' },
    result: 'src/app/(frontend)/layout.tsx\nsrc/app/(frontend)/[slug]/page.tsx',
    ms: 310,
  },
  {
    kind: 'tool',
    id: 'f4',
    name: 'Read',
    input: { file_path: 'src/app/(frontend)/layout.tsx' },
    // Lines, not one template: check-dist reads a line starting with `import` as a real import.
    result: [
      "import type { Metadata } from 'next'",
      "import { getSiteSettings } from '@/payload/settings'",
      '',
      'export async function generateMetadata(): Promise<Metadata> {',
      '  const settings = await getSiteSettings()',
      '  return {',
      "    metadataBase: new URL('https://www.camasys.com'),",
      "    title: { default: settings.title, template: '%s · Camasys' },",
      '    description: settings.description,',
      LAYOUT_BEFORE,
      '  }',
      '}',
    ].join('\n'),
    ms: 120,
  },
  {
    kind: 'tool',
    id: 'f5',
    name: 'Glob',
    input: { pattern: 'public/**/*.mp4' },
    result: 'public/media/hero-loop.mp4',
    ms: 90,
  },
  {
    kind: 'tool',
    id: 'f6',
    name: 'Bash',
    input: {
      command:
        'ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0 public/media/hero-loop.mp4 && du -h public/media/hero-loop.mp4',
      description: 'Read the hero loop’s size and dimensions',
    },
    result: '1280,720\n2.4M\tpublic/media/hero-loop.mp4',
    ms: 640,
  },
  {
    kind: 'text',
    id: 'f7',
    text: 'The hero already plays `public/media/hero-loop.mp4` (1280×720, 2.4 MB, under the 8 MB cap). I’ll point `og:video` at it from `generateMetadata`; `metadataBase` makes the URL absolute.',
  },
  {
    kind: 'tool',
    id: 'f8',
    name: 'Edit',
    input: { file_path: 'src/app/(frontend)/layout.tsx', old_string: LAYOUT_BEFORE, new_string: LAYOUT_AFTER },
    result: 'The file src/app/(frontend)/layout.tsx has been updated.',
    ms: 80,
  },
  {
    kind: 'tool',
    id: 'f9',
    name: 'Bash',
    input: { command: 'bunx tsc --noEmit', description: 'Typecheck' },
    result: '',
    ms: 9_400,
  },
  {
    kind: 'tool',
    id: 'f10',
    name: 'Bash',
    input: {
      command:
        "bun run build >/dev/null && (bun run start -p 3100 & sleep 4; curl -s localhost:3100 | grep -o '<meta property=\"og:video[^>]*>')",
      description: 'Build, serve and read the og:video tags',
    },
    result: [
      '<meta property="og:video" content="https://www.camasys.com/media/hero-loop.mp4"/>',
      '<meta property="og:video:type" content="video/mp4"/>',
      '<meta property="og:video:width" content="1280"/>',
      '<meta property="og:video:height" content="720"/>',
    ].join('\n'),
    ms: 214_000,
  },
  {
    kind: 'tool',
    id: 'f11',
    name: 'Bash',
    input: {
      command: "git add -A && git commit -m 'feat(seo): og:video for link previews'",
      description: 'Commit',
    },
    result: '[standards/og-video 3f2a9c1] feat(seo): og:video for link previews\n 1 file changed, 1 insertion(+)',
    ms: 410,
  },
  {
    kind: 'tool',
    id: 'f12',
    name: 'Bash',
    input: { command: 'git push -u origin standards/og-video', description: 'Push the branch' },
    result: "branch 'standards/og-video' set up to track 'origin/standards/og-video'.",
    ms: 2_300,
  },
  {
    kind: 'tool',
    id: 'f13',
    name: 'Bash',
    input: {
      command:
        "gh pr create --title 'feat(seo): og:video for link previews' --body 'Points og:video at the hero loop, so LinkedIn and X previews can play it. Fixes website/og-video.'",
      description: 'Open the PR',
    },
    result: 'https://github.com/camasys/web/pull/24',
    ms: 3_100,
  },
  {
    kind: 'text',
    id: 'f14',
    text: '`generateMetadata` now adds `openGraph.videos` with the hero loop, so the home page carries all four `og:video` tags (checked on a local build). The http check passes once this is deployed.\n\nhttps://github.com/camasys/web/pull/24',
  },
]

const CONFIG_BEFORE = `const nextConfig: NextConfig = {
  images: { remotePatterns: [{ hostname: 'cdn.camasys.com' }] },
}`

const CONFIG_AFTER = `const nextConfig: NextConfig = {
  images: { remotePatterns: [{ hostname: 'cdn.camasys.com' }] },
  async headers() {
    return [{ source: '/:path*', headers: [{ key: 'X-Content-Type-Options', value: 'nosniff' }] }]
  },
}`

const HEADERS_TRANSCRIPT: TranscriptItem[] = [
  {
    kind: 'user',
    id: 'r1',
    text: fixPrompt(
      'security-headers',
      'Basic security headers',
      'HSTS keeps visitors on HTTPS and nosniff stops browsers guessing content types; scanners and buyers check both',
      'header x-content-type-options is missing',
    ),
  },
  {
    kind: 'tool',
    id: 'r2',
    name: 'Read',
    input: { file_path: 'next.config.ts' },
    result: [
      "import { withPayload } from '@payloadcms/next/withPayload'",
      "import type { NextConfig } from 'next'",
      '',
      CONFIG_BEFORE,
      '',
      'export default withPayload(nextConfig)',
    ].join('\n'),
    ms: 100,
  },
  {
    kind: 'text',
    id: 'r3',
    text: 'HSTS already comes from Vercel. Only `X-Content-Type-Options` is missing: I’ll add it for every path in `headers()`.',
  },
  {
    kind: 'tool',
    id: 'r4',
    name: 'Edit',
    input: { file_path: 'next.config.ts', old_string: CONFIG_BEFORE, new_string: CONFIG_AFTER },
    result: 'The file next.config.ts has been updated.',
    ms: 70,
  },
  {
    kind: 'tool',
    id: 'r5',
    name: 'Bash',
    input: {
      command:
        "bun run build >/dev/null && (bun run start -p 3100 & sleep 4; curl -sI localhost:3100 | grep -i '^x-content')",
      description: 'Build, serve and read the header',
    },
  },
]

/** sonnet-fixer's og:video run: done, its PR merged. */
export const OG_VIDEO_FIX: FixRun = {
  id: 'run-og-video',
  worker: 'sonnet-fixer',
  model: 'sonnet',
  branch: 'standards/og-video',
  started_at: '2026-11-16T15:08:41.000Z',
  ms: 372_000,
  state: 'done',
  pr: { url: 'https://github.com/camasys/web/pull/24', number: 24, state: 'merged' },
  cost_usd: 0.41,
  transcript: OG_VIDEO_TRANSCRIPT,
}

/** sonnet-fixer on the security headers, still going. */
export const HEADERS_FIX: FixRun = {
  id: 'run-security-headers',
  worker: 'sonnet-fixer',
  model: 'sonnet',
  branch: 'standards/security-headers',
  started_at: '2026-11-19T11:27:48.000Z',
  state: 'running',
  transcript: HEADERS_TRANSCRIPT,
}

const at = (result: Result, checked_at: string, patch: Partial<Result> = {}): Result => ({
  ...result,
  checked_at,
  ...patch,
})

interface CellRuns {
  history: Result[]
  fixRuns: FixRun[]
}

const og = statusOf('camasys', 'site', 'website/og-video').result!
const headers = statusOf('camasys', 'site', 'website/security-headers').result!
const hero = statusOf('camasys', 'site', 'website/hero').result!
const sitemap = statusOf('camasys', 'site', 'website/sitemap-health').result!

/** By `business:asset:pack/item`. */
const RUNS: Record<string, CellRuns> = {
  'camasys:site:website/og-video': {
    history: [
      { ...og, log: OG_VIDEO_FAIL },
      at(og, '2026-11-18T10:52:04.871Z', { ms: 181, log: OG_VIDEO_FAIL }),
      at(og, '2026-11-17T10:52:06.040Z', {
        state: 'pass',
        evidence: SITE,
        ms: 2_210,
        log: OG_VIDEO_PASS,
      }),
      at(og, '2026-11-16T10:52:05.502Z', { ms: 169, log: OG_VIDEO_FAIL }),
    ],
    fixRuns: [OG_VIDEO_FIX],
  },
  'camasys:site:website/security-headers': {
    history: [{ ...headers, log: HEADERS_FAIL }, at(headers, '2026-11-18T10:52:05.120Z', { log: HEADERS_FAIL })],
    fixRuns: [HEADERS_FIX],
  },
  'camasys:site:website/hero': {
    history: [{ ...hero, log: HERO_LOG }, at(hero, '2026-11-18T10:52:15.640Z', { ms: 9_912, log: HERO_LOG })],
    fixRuns: [],
  },
  'camasys:site:website/sitemap-health': {
    history: [{ ...sitemap, log: SITEMAP_SCRIPT }],
    fixRuns: [],
  },
}

/** A cell's checks, newest first, and its fix runs: the invented ones above, else the invented history alone. */
export const runsOf = (business: string, cell: CellStatus): CellRuns =>
  RUNS[`${business}:${cellKey(cell.asset, cell.item)}`] ?? { history: historyOf(cell), fixRuns: [] }

export { HEADERS_FAIL, HERO_LOG, HERO_TRANSCRIPT, OG_VIDEO_FAIL, OG_VIDEO_TRANSCRIPT, SITEMAP_SCRIPT }
