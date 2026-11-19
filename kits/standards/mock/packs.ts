/*!
 * Docs-only mock data: the two packs the just-standards engine ships
 * (each pack's `pack.yml` and its items' `item.yml`), as loaded.
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
    },
  ],
}

export const PACKS: LoadedPack[] = [WEBSITE, REPO]
