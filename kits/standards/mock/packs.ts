/*!
 * Docs-only mock data: the two packs the just-standards engine ships
 * (each pack's `pack.yml`, its items' `item.yml` and `recipe.md`), as loaded.
 */

import type { LoadedPack } from '../lib/types'

const WEBSITE: LoadedPack = {
  id: 'website',
  version: 2,
  title: 'Website',
  description:
    'What every public website I run carries, so it previews well, gets indexed and is readable by AI tools.',
  items: [
    'meta-basics',
    'og-image',
    'og-video',
    'icons',
    'robots-sitemap',
    'structured-data',
    'llms-txt',
    'security-headers',
    {
      id: 'sitemap-health',
      since: 2,
    },
    {
      id: 'hero',
      since: 2,
    },
  ],
  changelog: [
    {
      version: 2,
      date: '2026-11-19',
      notes:
        "robots-sitemap v2 also fails a site-wide Disallow. Added sitemap-health (every sampled sitemap URL answers 200 on the site's own host) and hero (an AI reads the first screen).",
    },
    {
      version: 1,
      date: '2026-11-19',
      notes: 'First version.',
    },
  ],
  entries: [
    {
      id: 'meta-basics',
      version: 1,
      title: 'Title, description, canonical, lang',
      why: 'search results and AI answers quote the title and description; the canonical stops duplicate URLs from splitting ranking',
      applies_to: ['website', 'webapp'],
      owner_role: 'seo',
      check: {
        kind: 'http',
        requests: [
          {
            path: '/',
            expect: [
              {
                select: 'title',
                min_length: 10,
                max_length: 70,
              },
              {
                select: 'meta[name="description"]',
                attr: 'content',
                min_length: 50,
                max_length: 170,
              },
              {
                select: 'link[rel="canonical"]',
                attr: 'href',
                absolute_url: true,
              },
              {
                select: 'html',
                attr: 'lang',
              },
            ],
          },
        ],
      },
      pack: 'website',
      key: 'website/meta-basics',
      since: 1,
      label: 'meta basics',
      recipe: `Set these on the home page, and per page where the framework makes it cheap:

- \`<html lang="…">\` with the page language.
- \`<title>\`: 10–70 characters, what the page is, then the brand: \`Car rental software for independent fleets · Camasys\`.
- \`<meta name="description">\`: 50–170 characters, one plain sentence about what a visitor gets.
- \`<link rel="canonical">\`: the absolute URL of the page, on the production domain, without tracking parameters.

By stack:

- **Next.js (App Router), Payload + Next:** \`export const metadata\` (or \`generateMetadata\`) in \`app/layout.tsx\` and pages, with \`metadataBase\` set to the production origin and \`alternates: { canonical: '/' }\`. \`lang\` goes on \`<html>\` in the root layout. With Payload, read title and description from the SEO fields or global, falling back to the defaults.
- **Astro:** a shared \`<Seo>\` component or the layout's \`<head>\`; \`Astro.site\` must be set in \`astro.config\` so the canonical is absolute.
- **Static HTML:** write the tags into \`<head>\` of \`index.html\`.

Write copy from what the site actually says; don't invent claims.`,
    },
    {
      id: 'og-image',
      version: 1,
      title: 'Open Graph image and card',
      why: 'a link shared on LinkedIn, X, Slack or iMessage shows a large picture and title instead of a bare URL',
      applies_to: ['website', 'webapp'],
      owner_role: 'seo',
      check: {
        kind: 'http',
        requests: [
          {
            path: '/',
            expect: [
              {
                select: 'meta[property="og:image"]',
                attr: 'content',
                absolute_url: true,
                follow: {
                  status: 200,
                  content_type: 'image/',
                  max_bytes: 5000000,
                },
              },
              {
                select: 'meta[property="og:title"]',
                attr: 'content',
              },
              {
                select: 'meta[property="og:description"]',
                attr: 'content',
              },
              {
                select: 'meta[name="twitter:card"]',
                attr: 'content',
                equals: 'summary_large_image',
              },
            ],
          },
        ],
      },
      pack: 'website',
      key: 'website/og-image',
      since: 1,
      label: 'og:image',
      recipe: `Add \`og:image\` (1200×630 PNG or JPG, under 5 MB, absolute URL), \`og:title\`, \`og:description\` and \`twitter:card\` = \`summary_large_image\`.

- **Image:** reuse the brand's existing social image if the repo has one. Otherwise generate it from the code: Next.js \`app/opengraph-image.tsx\` with \`ImageResponse\` (logo, title, one line, brand colours from the site's CSS), or a static file in \`public/\`. Never use a placeholder or stock picture; if no brand assets exist, say so in the PR.
- **Next.js / Payload + Next:** \`metadata.openGraph\` and \`metadata.twitter\` in the root layout; \`metadataBase\` makes the image URL absolute.
- **Astro / static:** the four \`<meta>\` tags in \`<head>\`, with the image under \`public/\` and the URL built from the site origin.

Check the result with \`curl -s <url> | grep og:\` and that the image URL answers 200 with an \`image/*\` type.`,
    },
    {
      id: 'og-video',
      version: 1,
      title: 'og:video on the home page',
      why: 'link previews on LinkedIn and X can play a short loop instead of a still, which gets more clicks',
      applies_to: ['website'],
      owner_role: 'content',
      check: {
        kind: 'http',
        requests: [
          {
            path: '/',
            expect: [
              {
                select: 'meta[property="og:video"]',
                attr: 'content',
                absolute_url: true,
                follow: {
                  status: 200,
                  content_type: 'video/mp4',
                  max_bytes: 8000000,
                },
              },
              {
                select: 'meta[property="og:video:type"]',
                attr: 'content',
                equals: 'video/mp4',
              },
              {
                select: 'meta[property="og:video:width"]',
                attr: 'content',
              },
              {
                select: 'meta[property="og:video:height"]',
                attr: 'content',
              },
            ],
          },
        ],
      },
      pack: 'website',
      key: 'website/og-video',
      since: 1,
      label: 'og:video',
      recipe: `Add \`og:video\` with its type and size next to the existing \`og:image\` (keep the image: platforms that don't play video fall back to it).

\`\`\`html
<meta property="og:video" content="https://example.com/og/loop.mp4">
<meta property="og:video:secure_url" content="https://example.com/og/loop.mp4">
<meta property="og:video:type" content="video/mp4">
<meta property="og:video:width" content="1280">
<meta property="og:video:height" content="720">
\`\`\`

- **The video:** an MP4 (H.264, no audio needed), 1280×720, a 3–8 s loop, under 8 MB, served from the site's own origin (\`public/og/loop.mp4\`). Use a video the repo already has (a hero or demo clip). If there is none, don't fake one: wire the tags behind a single constant, leave the file out, and say in the PR that a person must add \`public/og/loop.mp4\`.
- **Next.js / Payload + Next:** \`metadata.openGraph.videos = [{ url, secureUrl, type: 'video/mp4', width: 1280, height: 720 }]\`. With Payload, prefer an upload field on the SEO global (\`ogVideo\`, relation to media) read in \`generateMetadata\`, with the static file as the fallback.
- **Astro / static:** the tags in \`<head>\`, URL built from the site origin.`,
    },
    {
      id: 'icons',
      version: 1,
      title: 'Favicon and touch icon',
      why: 'tabs, bookmarks, home-screen shortcuts and search results show the brand mark instead of a blank page',
      applies_to: ['website', 'webapp'],
      owner_role: 'engineering',
      check: {
        kind: 'http',
        requests: [
          {
            path: '/',
            expect: [
              {
                select: 'link[rel~="icon"]',
                attr: 'href',
                follow: {
                  status: 200,
                },
              },
              {
                select: 'link[rel="apple-touch-icon"]',
                attr: 'href',
                follow: {
                  status: 200,
                },
              },
            ],
          },
        ],
      },
      pack: 'website',
      key: 'website/icons',
      since: 1,
      label: 'icons',
      recipe: `Ship a favicon (SVG preferred, plus a 32×32 PNG or ICO fallback) and a 180×180 \`apple-touch-icon\` PNG, made from the logo the repo already has.

- **Next.js:** \`app/icon.svg\` (or \`icon.png\`) and \`app/apple-icon.png\`; Next writes the \`<link>\` tags itself.
- **Astro / static:** files in \`public/\` and \`<link rel="icon" href="/favicon.svg" type="image/svg+xml">\`, \`<link rel="apple-touch-icon" href="/apple-touch-icon.png">\` in \`<head>\`.

If there is no logo in the repo, stop and say so in the PR.`,
    },
    {
      id: 'robots-sitemap',
      version: 2,
      title: 'robots.txt allows crawling and points at a sitemap',
      why: 'crawlers, including AI crawlers, find every page from the sitemap instead of guessing from links; a site-wide Disallow hides the site from search',
      applies_to: ['website'],
      owner_role: 'seo',
      check: {
        kind: 'http',
        requests: [
          {
            path: '/robots.txt',
            expect: [
              {
                status: 200,
              },
              {
                body: true,
                matches: 'sitemap:\\s*https?://',
              },
              {
                body: true,
                not_matches: 'user-agent:\\s*\\*\\s*disallow:\\s*/(\\s|$)',
              },
            ],
          },
        ],
      },
      pack: 'website',
      key: 'website/robots-sitemap',
      since: 1,
      label: 'robots + sitemap',
      recipe: `Serve \`/robots.txt\` that allows crawling of public pages (never \`Disallow: /\` for \`User-agent: *\` on a live site) and names the sitemap by absolute URL, and serve that sitemap listing every public page.

- **Next.js:** \`app/robots.ts\` returning \`{ rules: { userAgent: '*', allow: '/' }, sitemap: '<origin>/sitemap.xml' }\` and \`app/sitemap.ts\` listing the routes (and CMS documents for Payload, with \`lastModified\`).
- **Astro:** \`@astrojs/sitemap\` (needs \`site\` in the config) and \`public/robots.txt\` with \`Sitemap: <origin>/sitemap-index.xml\`.
- **Static:** write both files by hand.

Don't block AI crawlers (GPTBot, ClaudeBot, PerplexityBot) unless the repo already says to.`,
    },
    {
      id: 'structured-data',
      version: 1,
      title: 'Structured data (JSON-LD)',
      why: 'search engines and AI answers read who is behind the site and what it offers from schema.org data',
      applies_to: ['website'],
      owner_role: 'seo',
      check: {
        kind: 'http',
        requests: [
          {
            path: '/',
            expect: [
              {
                select: 'script[type="application/ld+json"]',
                json: true,
                matches: '"@type"\\s*:\\s*"(Organization|WebSite|Person|SoftwareApplication|Product|LocalBusiness)"',
              },
            ],
          },
        ],
      },
      pack: 'website',
      key: 'website/structured-data',
      since: 1,
      label: 'structured data',
      recipe: `Add one \`<script type="application/ld+json">\` to the home page with a schema.org \`Organization\` (or \`Person\` for a personal site) and a \`WebSite\`, in an \`@graph\`:

- Organization: \`name\`, \`url\`, \`logo\` (absolute), \`sameAs\` (the real social profiles linked from the site).
- WebSite: \`name\`, \`url\`.
- A product site may add \`SoftwareApplication\` or \`Product\`, with only facts the site states.

- **Next.js:** render it in the root layout or home page: \`<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />\`.
- **Astro / static:** the same tag in \`<head>\`.

Validate the JSON parses. Never invent ratings, prices or reviews.`,
    },
    {
      id: 'llms-txt',
      version: 1,
      title: 'llms.txt',
      why: 'AI tools and agents get a short, curated map of the site instead of crawling it blind',
      applies_to: ['website'],
      owner_role: 'seo',
      check: {
        kind: 'http',
        requests: [
          {
            path: '/llms.txt',
            expect: [
              {
                status: 200,
              },
              {
                body: true,
                matches: '^\\s*# \\S',
                min_length: 100,
              },
            ],
          },
        ],
      },
      pack: 'website',
      key: 'website/llms-txt',
      since: 1,
      label: 'llms.txt',
      recipe: `Serve \`/llms.txt\` in the llmstxt.org format: an \`# H1\` with the site name, a \`> \` one-paragraph summary, then \`## \` sections of Markdown links to the most useful pages, each with a short note.

Build it from the real pages (the sitemap or routes), not from memory. Keep it under a few hundred lines.

- **Next.js:** a \`public/llms.txt\`, or \`app/llms.txt/route.ts\` that builds it from the CMS for Payload sites.
- **Astro / static:** \`public/llms.txt\`.`,
    },
    {
      id: 'security-headers',
      version: 1,
      title: 'Basic security headers',
      why: 'HSTS keeps visitors on HTTPS and nosniff stops browsers guessing content types; scanners and buyers check both',
      applies_to: ['website', 'webapp'],
      owner_role: 'engineering',
      check: {
        kind: 'http',
        requests: [
          {
            path: '/',
            expect: [
              {
                header: 'strict-transport-security',
                matches: 'max-age=\\d{7,}',
              },
              {
                header: 'x-content-type-options',
                equals: 'nosniff',
              },
            ],
          },
        ],
      },
      pack: 'website',
      key: 'website/security-headers',
      since: 1,
      label: 'security headers',
      recipe: `Send \`Strict-Transport-Security: max-age=63072000; includeSubDomains\` and \`X-Content-Type-Options: nosniff\` on every response.

- **Next.js on Vercel or self-hosted:** \`headers()\` in \`next.config.*\` for \`source: '/(.*)'\`.
- **Vercel (any framework):** \`headers\` in \`vercel.json\` / \`vercel.ts\`.
- **GitHub Pages:** headers can't be set; HSTS comes from github.io itself. Say so in the PR and suggest a waiver for \`x-content-type-options\` instead of changing hosting.
- **Behind a proxy (Dokploy, Traefik, nginx):** set them in the proxy config if the app can't.

Don't add a Content-Security-Policy in this change: it needs its own testing.`,
    },
    {
      id: 'sitemap-health',
      version: 1,
      title: "Sitemap URLs answer on the site's own host",
      why: 'a sitemap full of redirects, 404s or staging hosts wastes crawl budget and gets pages dropped',
      applies_to: ['website'],
      owner_role: 'seo',
      check: {
        kind: 'script',
        file: 'check.ts',
      },
      pack: 'website',
      key: 'website/sitemap-health',
      since: 2,
      label: 'sitemap health',
      recipe: `Make the sitemap list only canonical, live pages on the production host:

- Generate it from the real routes and CMS documents (published only), not a hand-kept list.
- Every URL absolute, on the production origin (no \`localhost\`, preview or staging hosts, no \`http://\` when the site is HTTPS), and exactly the canonical form (trailing slash and \`www\` as the site serves them, so no URL redirects).
- Drop pages that 404, redirect, or are \`noindex\`.

- **Next.js / Payload:** \`app/sitemap.ts\` built from the routes and the CMS, with the origin from one env variable (\`NEXT_PUBLIC_SERVER_URL\` or \`metadataBase\`) that is set to production in the production environment.
- **Astro:** \`@astrojs/sitemap\` with \`site\` set to the production origin, and \`filter\` for drafts.
- **WordPress:** the core sitemap or the SEO plugin's, after fixing the Site Address and removing noindex or redirected pages from it.`,
    },
    {
      id: 'hero',
      version: 1,
      title: 'The first screen says what it is, for whom, and what to do',
      why: 'visitors and AI summaries decide from the first screen; a vague hero loses both',
      applies_to: ['website'],
      owner_role: 'content',
      check: {
        kind: 'ai',
        model: 'haiku',
        prompt:
          'Fetch the home page at the URL above and read its first screen: the main heading, the line under it, and the primary button or link.\nPass only if a stranger could tell from those alone (1) what the product or company is, (2) who it is for, and (3) what to do next.\nFail when any of the three is missing, or only implied through jargon or slogans. Quote the heading in your evidence and name what is missing.\n',
      },
      pack: 'website',
      key: 'website/hero',
      since: 2,
      label: 'hero',
      recipe: `Rewrite the first screen of the home page so the heading, the line under it and the primary button answer: what is it, who is it for, what do I do next.

- **Heading:** the product or service in plain words, plus the audience when it fits: \`Rental software for independent car-hire fleets\`. No slogans that need the rest of the page to make sense.
- **Line under it:** one sentence with the main outcome, in the site's own terms. Only claims the site already supports elsewhere (case studies, numbers on the page); never invent figures.
- **Primary button:** a specific next step (\`Book a demo\`, \`Get a quote\`), linked to where it actually goes.
- Keep the design: change copy, and layout only if the button is missing.
- Keep every language version in step (WPML, Payload locales, i18n files).

In the PR body, put the old and new heading, line and button side by side so a person can judge the copy.`,
    },
  ],
}

const REPO: LoadedPack = {
  id: 'repo',
  version: 1,
  title: 'Repo',
  description:
    'Every GitHub repo I keep reads well from the outside. The fixer for all of it is the repo-standard skill in this folder (SKILL.md).',
  items: ['readme', 'banner', 'description', 'topics', 'homepage', 'license', 'gitignore', 'no-env'],
  changelog: [
    {
      version: 1,
      date: '2026-11-19',
      notes: "The repo-standard skill's checks as a pack.",
    },
  ],
  entries: [
    {
      id: 'readme',
      version: 1,
      title: 'README written from the code',
      why: 'the README is the page people and AI tools read first; a thin or boilerplate one hides what the repo does',
      applies_to: ['repo'],
      owner_role: 'engineering',
      check: {
        kind: 'github',
        expect: [
          {
            field: 'readme',
            min_length: 400,
            not_matches:
              'bootstrapped with|create-next-app|This template provides a minimal setup|Mintlify Starter Kit',
          },
        ],
      },
      pack: 'repo',
      key: 'repo/readme',
      since: 1,
      label: 'README',
      recipe: `Follow the \`repo-standard\` skill in this pack (\`SKILL.md\`, with \`references/\` and \`scripts/\` beside it): its procedure step 2 (read the code) and step 3 (write the README for the tier), with the templates in \`references/readme.md\`.

The rules in this prompt win over the skill where they differ: open a pull request instead of pushing to the default branch, and don't archive, rename or change visibility.`,
    },
    {
      id: 'banner',
      version: 1,
      title: 'Banner at the top of the README',
      why: 'one picture says what the repo is before anyone reads a line',
      applies_to: ['repo'],
      owner_role: 'engineering',
      check: {
        kind: 'repo',
        expect: [
          {
            file: '.github/banner.svg',
          },
          {
            file: 'README.md',
            matches: '\\.github/banner\\.svg',
          },
        ],
      },
      pack: 'repo',
      key: 'repo/banner',
      since: 1,
      label: 'banner',
      recipe: `Follow the \`repo-standard\` skill in this pack (\`SKILL.md\`, with \`references/\` and \`scripts/\` beside it): its step 4 (visuals): render \`.github/banner.svg\` with \`scripts/banner.mjs\` from a spec, check both themes, and link it as the first line of the README.

The rules in this prompt win over the skill where they differ: open a pull request instead of pushing to the default branch, and don't archive, rename or change visibility.`,
    },
    {
      id: 'description',
      version: 1,
      title: 'One-line description',
      why: 'the description is what GitHub search, link previews and profile pages show',
      applies_to: ['repo'],
      owner_role: 'engineering',
      check: {
        kind: 'github',
        expect: [
          {
            field: 'description',
            min_length: 20,
            max_length: 100,
            not_matches: '\\.$',
          },
        ],
      },
      pack: 'repo',
      key: 'repo/description',
      since: 1,
      label: 'description',
      recipe: `Follow the \`repo-standard\` skill in this pack (\`SKILL.md\`, with \`references/\` and \`scripts/\` beside it): its step 5: \`gh repo edit --description\`, one line, at most 100 characters, says what it is, no trailing period. This is a repo setting, not a file: set it directly and mention it in the PR body.

The rules in this prompt win over the skill where they differ: open a pull request instead of pushing to the default branch, and don't archive, rename or change visibility.`,
    },
    {
      id: 'topics',
      version: 1,
      title: '3–8 topics',
      why: "topics put the repo in GitHub's topic pages and search filters",
      applies_to: ['repo'],
      owner_role: 'engineering',
      check: {
        kind: 'github',
        expect: [
          {
            field: 'topics',
            min_length: 3,
            max_length: 8,
          },
        ],
      },
      pack: 'repo',
      key: 'repo/topics',
      since: 1,
      label: 'topics',
      recipe: `Follow the \`repo-standard\` skill in this pack (\`SKILL.md\`, with \`references/\` and \`scripts/\` beside it): its step 5 with the vocabulary in \`references/topics.md\`: \`gh repo edit --add-topic\` / \`--remove-topic\`. A repo setting: set it directly and mention it in the PR body.

The rules in this prompt win over the skill where they differ: open a pull request instead of pushing to the default branch, and don't archive, rename or change visibility.`,
    },
    {
      id: 'homepage',
      version: 1,
      title: 'Homepage that answers',
      why: 'the homepage link is the way from the repo to the live thing; a dead one costs trust',
      applies_to: ['repo'],
      owner_role: 'engineering',
      check: {
        kind: 'github',
        expect: [
          {
            field: 'homepage',
            absolute_url: true,
            follow: {
              status: 200,
            },
          },
        ],
      },
      pack: 'repo',
      key: 'repo/homepage',
      since: 1,
      label: 'homepage',
      recipe: `Follow the \`repo-standard\` skill in this pack (\`SKILL.md\`, with \`references/\` and \`scripts/\` beside it): its step 5: the live demo or docs URL, else \`https://github.com/<owner>/<repo>#readme\`; check it answers with \`curl -sI\`. A repo setting: set it directly and mention it in the PR body.

The rules in this prompt win over the skill where they differ: open a pull request instead of pushing to the default branch, and don't archive, rename or change visibility.`,
    },
    {
      id: 'license',
      version: 1,
      title: 'License',
      why: "without a license nobody may legally use the code; with the wrong one the repo says something it shouldn't",
      applies_to: ['repo'],
      owner_role: 'engineering',
      check: {
        kind: 'github',
        expect: [
          {
            field: 'license',
          },
        ],
      },
      pack: 'repo',
      key: 'repo/license',
      since: 1,
      label: 'LICENSE',
      recipe: `Follow the \`repo-standard\` skill in this pack (\`SKILL.md\`, with \`references/\` and \`scripts/\` beside it): its step 6 (files → LICENSE) and its rules on other people's work. Where the skill says to add no license (forks, private repos, co-authored code), add none and say in the PR body that this cell should be waived.

The rules in this prompt win over the skill where they differ: open a pull request instead of pushing to the default branch, and don't archive, rename or change visibility.`,
    },
    {
      id: 'gitignore',
      version: 1,
      title: '.gitignore',
      why: 'keeps build output, IDE files and local secrets out of the repo',
      applies_to: ['repo'],
      owner_role: 'engineering',
      check: {
        kind: 'repo',
        expect: [
          {
            file: '.gitignore',
          },
        ],
      },
      pack: 'repo',
      key: 'repo/gitignore',
      since: 1,
      label: '.gitignore',
      recipe: `Follow the \`repo-standard\` skill in this pack (\`SKILL.md\`, with \`references/\` and \`scripts/\` beside it): its step 6 (files → .gitignore): the github/gitignore template for the main language plus \`.idea/\`, \`.DS_Store\`, \`.env\`, \`node_modules/\`; untrack IDE files with \`git rm -r --cached\`.

The rules in this prompt win over the skill where they differ: open a pull request instead of pushing to the default branch, and don't archive, rename or change visibility.`,
    },
    {
      id: 'no-env',
      version: 1,
      title: 'No tracked .env',
      why: 'a committed .env leaks secrets to everyone who can read the repo',
      applies_to: ['repo'],
      owner_role: 'engineering',
      check: {
        kind: 'repo',
        expect: [
          {
            untracked: '.env',
          },
        ],
      },
      pack: 'repo',
      key: 'repo/no-env',
      since: 1,
      label: 'no .env',
      recipe: `Follow the \`repo-standard\` skill in this pack (\`SKILL.md\`, with \`references/\` and \`scripts/\` beside it): its step 6 (secrets): untrack \`.env\` with \`git rm --cached .env\`, add it to \`.gitignore\`, never print its values, and say in the PR body which secrets must be rotated and that they stay in git history.

The rules in this prompt win over the skill where they differ: open a pull request instead of pushing to the default branch, and don't archive, rename or change visibility.`,
    },
  ],
}

export const PACKS: LoadedPack[] = [WEBSITE, REPO]
