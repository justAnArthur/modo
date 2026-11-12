# Changelog

Both packages are released from this repo by conventional commits (see [CONTRIBUTING.md](CONTRIBUTING.md)): `@justanarthur/modo` (`lib/`) and `@justanarthur/modo-ui` (`ui/`). Each release also gets GitHub release notes generated from its commits.

## Unreleased → 1.0.0

The first stable release of both packages. From here on the public API follows semver: a breaking change means a new major.

### @justanarthur/modo

What 1.0 is:

- **A docs site from a design system, with no content of its own.** modo discovers `tokens/`, `primitives/`, `components/`, `blocks/` and `pages/` by directory and renders them in its own Vite app. Every token, visual, component and piece of documentation comes from the host; the chrome carries only its own labels.
- **Items documented by TSDoc.** An item is `<tier>/[<group>/…]<name>/index.tsx`: name, lead, body and props come from its doc comment and its types (`@default`, `@values`, `{@include}`, `{@includeCode}`). Group folders nest the sidebar and the tier overviews.
- **Live examples** from a co-located `examples.mdx`, built with the rest of the design system in one shared esbuild build, each in an example card with Show code and Copy. Short inline `@example` blocks compile in the browser.
- **Foundation pages** for colors, typography (elements, families, scale, weights), radius, spacing and motion, read from `tokens/*.css`.
- **Pages tier** for full screens assembled from blocks.
- **Canvas** (`/canvas`): every foundation and item live on one pan-and-zoom surface, fast with hundreds of items.
- **Shell inheritance.** The chrome renders with the host's own Button, Link, Code, Icon, Select and Sidebar when they match by name and props (or are pinned in `shell`), with structural Plain fallbacks otherwise. The host restyles the rest through `data-modo` attributes.
- **Structural CSS only.** Every visual reads a token through a small generic contract (shadcn names: `--border`, `--muted-foreground`, `--font-size-<role>`, `--space-*`, …), so the site looks like the design system it documents.
- **`modo.config.ts`**: `name`, `description`, `css`, `vite` (extend the internal Vite config, e.g. Tailwind or UnoCSS), `shell`, `panel`, `examples`, `base`, and site branding.
- **Static builds** with a copy of the shell per route, per-page head tags and a `404.html`, ready for GitHub Pages or any static host.

New since 0.9:

- `modo init` ships a `.gitignore`, pins `@justanarthur/modo` to the version that scaffolded it, starts on React 19, validates the project name and prints the next steps.
- `modo preview` serves the built site.
- `modo dev --port` and `--host`; every flag also takes `--flag=value`; an unknown flag fails with the help text.
- `modo add page` is listed in the help.
- Site branding: a header and footer from the config, socials, per-page head tags.
- Item pages show a metadata row from doc-comment block tags (`@since`, `@source`, `@license`, …) and link to the item's source in the repo.
- Builds fail on item errors instead of shipping a broken page; Babel for inline examples loads lazily.
- The canvas opens fitted to the view; bento previews fit and pack, example rows and token labels wrap; the nav no longer repeats the design system's name.
- `engines`: Node 20.11 or newer.

### @justanarthur/modo-ui

What 1.0 is:

- **Fluid Functionalism (Base UI flavor) on UnoCSS**: motion springs, fluid hover, a two-step size ladder and an eight-level elevated surface system.
- **A morph layer**: overlays grow out of their trigger, travelling indicators melt between items (`useMorph`, `MorphSurface`, `GooIndicator`).
- **The field ladder**: every text field (Input, Textarea, InputGroup) on one shared field box with a variant; Checkbox, Radio and Switch with their groups; date and time pickers on react-day-picker.
- **Published for any stack**: components and types from the package root and per item (`/primitives/*`, `/components/*`, `/blocks/*`), the UnoCSS preset (`/unocss`), and `styles.css`, `base.css`, `tokens.css` and `tailwind.css` for Tailwind v4 hosts.
- **Its own docs, built with modo**, with its design language in `DESIGN.md`, an agent guide in `AGENTS.md` and a Craft page of bad / good pairs.

New since 0.6:

- The morph layer and Craft export from the package root.
- `dist` keeps `'use client'` and the licence headers of derived code; `pdfjs-dist` is an optional peer; `sideEffects` and `engines` are set.
- The card eyebrow drops uppercase and letter-spacing.
