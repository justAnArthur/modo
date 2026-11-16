# Guides

A guide is a free-form page: getting started, theming, migration notes. Each `.mdx` file in a `guides/` folder beside the tiers (under [`root`](./config.md#root) when you set one) becomes a page at `/guides/<slug>`. You register nothing.

```
guides/
├── index.mdx                   — /guides
├── 01-getting-started.mdx      — /guides/getting-started
└── 02-theming/                 — sidebar group "Theming"
    ├── index.mdx               — /guides/theming, the folder's landing page
    ├── 01-tokens.mdx           — /guides/theming/tokens
    └── 02-dark-mode.mdx        — /guides/theming/dark-mode
```

- **Order.** Guides list in file-name order. A leading `01-` sets it and is dropped from the URL and the title; folders sort the same way.
- **Folders** are nested sidebar sections. A folder's `index.mdx` is its landing page at the folder's URL, listed first in its section; `guides/index.mdx` is `/guides`. Name a folder that doesn't capitalize well with [`groups`](./config.md#groups).
- **URLs** keep the file name otherwise: spaces and non-ASCII letters work (`návody/začíname.mdx` → `/guides/návody/začíname`). Two files that end up at the same URL (`01-setup.mdx` and `setup.mdx`) are an error; the second is skipped.
- **The Guides section** opens the sidebar, before Foundations and the tiers, and the overview gets a Guides card listing them. Without a `guides/` folder neither appears.

## Frontmatter

```mdx
---
title: Getting started
description: Install the package and render a component.
---
```

`title` is the page's heading, sidebar label and `<title>`; without it the file name reads as a title (`getting-started` → "Getting started", a landing page takes its folder's name). `description` is the lead under the heading and the page's meta description. Other keys are ignored. Frontmatter that isn't a YAML mapping prints a `[modo:bundle] warning:` and is skipped.

## Content

A guide is MDX built with the items, in the same build: Markdown (GitHub-flavored), imports and JSX.

- The title is the page's only `h1`: `#` and `##` both render as sections, `###` and `####` below them. All get anchors and feed "On this page".
- Links and code fences render through the shell's Link and Code. A root-relative link (`/docs/tokens`) is an app path and gets the site's base.
- Every top-level JSX block is a live example card with Show code / Copy, as in an item's `examples.mdx`. Items and the [`examples`](./config.md#examples) scope resolve as tags without an import; import anything used in an expression.

```mdx
import Button from '../components/button'

## Try it

<Button variant="primary">Save</Button>
```

In `modo dev`, adding, editing or removing a guide rebuilds and reloads the page. `modo build` writes each guide as its own route (`guides/<slug>/index.html`) with its title and description in the head.
