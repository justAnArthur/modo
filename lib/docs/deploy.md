# Deploying

`modo build` writes a static site to `./dist`. Any static host serves it; there is no server and no SPA rewrite to configure.

```sh
modo build                   # ./dist, served at /
modo build --base /my-ds/    # served under a sub-path
modo build --out docs-dist   # another output dir, relative to the project
```

## What the build writes

- `index.html` for the home page.
- A copy of the app shell at `<route>/index.html` for every route, each with its own `<title>`, description and Open Graph tags: `canvas/`, `docs/tokens/`, `docs/tokens/<group>/`, `docs/<tier>/` and `docs/<tier>/<id>/`. A deep link works on a host with no SPA fallback.
- `404.html` for any other path. GitHub Pages, Netlify and Vercel serve it automatically.
- `favicon.<ext>` when [`favicon`](./config.md#favicon) is set.
- Hashed JS and CSS under `assets/`.

The build empties the output dir first. If `./dist` holds your package build, use `--out`.

The build fails, and writes no site, when the shared bundle reports an error: an item that doesn't compile, an `index.tsx` with no default export, two items with the same id in a tier, an `examples` module that doesn't resolve. See [troubleshooting.md](./troubleshooting.md).

## The base path

When the site isn't at the domain root, set the public path. It must start and end with `/`.

```ts
// modo.config.ts
base: '/my-ds/',
```

`modo build --base /my-ds/` overrides the config. Set [`url`](./config.md#url) as well to get canonical links and `og:url`.

## GitHub Pages

A project site is served at `https://<user>.github.io/<repo>/`, so build with `--base /<repo>/`. In the repository, set Settings → Pages → Source to GitHub Actions, then add a workflow:

```yaml
# .github/workflows/pages.yml
name: pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/checkout@v7
      - uses: oven-sh/setup-bun@v2
      - id: pages
        uses: actions/configure-pages@v6
      - run: bun install --frozen-lockfile
      - run: bunx modo build --base ${{ steps.pages.outputs.base_path }}/
      - uses: actions/upload-pages-artifact@v5
        with:
          path: dist
      - id: deployment
        uses: actions/deploy-pages@v5
```

`configure-pages` reports the base path (`/<repo>`, or empty on a custom domain or a `<user>.github.io` repo), so the same workflow works for both. With npm, use `npm ci` and `npx modo build`.

The modo repository deploys its demos this way: see [`.github/workflows/pages.yml`](https://github.com/justAnArthur/modo/blob/main/.github/workflows/pages.yml).

## Netlify

```toml
# netlify.toml
[build]
  command = "npx modo build"
  publish = "dist"
```

The site is at the domain root, so no `--base`. Netlify serves `404.html` for unknown paths.

## Vercel

Import the repository with the framework preset set to Other, then:

| Setting | Value |
| --- | --- |
| Build command | `npx modo build` |
| Output directory | `dist` |

Or commit it:

```json
{
  "buildCommand": "npx modo build",
  "outputDirectory": "dist"
}
```

Vercel serves `404.html` for unknown paths.

## Other hosts

Upload `dist/`. The host needs to serve `<path>/index.html` for `<path>/` (nearly all do) and, ideally, `404.html` for misses.
