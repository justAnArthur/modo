# Contributing to modo

Thanks for helping. This is a bun monorepo: the lib (`lib/`, `@justanarthur/modo`), the ui design system (`ui/`, `@justanarthur/modo-ui`) and the demo harness (`demo/`), with one design system per folder in `demo/design-systems/`. [AGENTS.md](AGENTS.md) is the full guide to the layout, the code style and the styling rules; read its **styling** section before touching CSS or components.

## Setup

You need [bun](https://bun.sh) and Node 20.11 or newer.

```sh
git clone https://github.com/justAnArthur/modo.git
cd modo
bun install
```

## Running it

```sh
bun dev              # every demo design system, one dev server each (ports 5173+), with a switcher
cd demo && bun dev filled   # one design system
```

The runner builds the lib's CLI first when its sources are newer than `lib/dist`. To try the CLI the way users get it, run `.github/scripts/smoke-init.sh`: it packs the lib, `modo init`s a project with the tarball and builds it.

## Checks

CI runs these on every push and pull request; run them before you open one:

```sh
bun run lint                       # biome (bun run format fixes most of it)
bun run build && bun run check     # builds the lib and ui, then typechecks every workspace
bun run test                       # the lib's tests
.github/scripts/check-ui-pack.sh   # the ui tarball holds its entry, styles and licence
.github/scripts/smoke-init.sh      # pack, init, install, build
```

Pull requests also build the demo site (`cd demo && SITE_BASE=/ bun run build`).

## Commits

Commits follow [Conventional Commits](https://www.conventionalcommits.org/) with a scope, and the scope decides what gets released:

| Scope | Releases |
|-------|----------|
| `lib`, `modo`, `@justanarthur/modo` | `@justanarthur/modo` |
| `ui`, `modo-ui`, `@justanarthur/modo-ui` | `@justanarthur/modo-ui` |
| `demo`, anything else, or none | nothing |

On a released scope, `feat` and `perf` bump the minor and everything else (`fix`, `refactor`, `docs`, `chore`, …) the patch, as soon as the commit lands on `main`. Put `[skip bump]` in the message when it shouldn't release anything (CI, repo files). A breaking change bumps the major: since 1.0 that is a deliberate decision, so read the release notes in [.github/AGENTS.md](.github/AGENTS.md#11-this-repo-modo) before you mark one.

Examples:

```
feat(lib): modo preview serves the built site
fix(ui): scroll-fade tracks ScrollArea edges in Firefox
feat(demo): dark mode in the MUI design system
ci: smoke-test the packed lib [skip bump]
```

## Pull requests

- Keep one change per pull request and say how you checked it (the checks above, plus a screenshot for anything visible).
- New items follow the item layout in AGENTS.md: `index.tsx` with a TSDoc block, examples in `examples.mdx`.
- Don't hand-edit `.github/workflows/bump-version.yml` or `publish-npm-on-tag.yml`: they come from a toolkit (see `.github/AGENTS.md`).

## Releases

Releases are cut from GitHub Actions, never from a laptop: [.github/AGENTS.md](.github/AGENTS.md) explains the pipeline and the exact steps for a major such as 1.0.0.

## Security

Please report vulnerabilities privately, as described in [SECURITY.md](SECURITY.md).
