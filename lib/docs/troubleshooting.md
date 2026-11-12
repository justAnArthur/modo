# Troubleshooting

modo prints its own messages to stderr with a prefix that says which part spoke. In `modo dev` a report prints once and again only when it changes.

## Dev keeps going, build stops

- `modo dev` keeps serving everything that built. A broken item drops out of the site until you fix it; the rest works.
- `modo build` fails on any `[modo:bundle]` error and writes no site:

  ```
  x Build failed in 17.66s
  Error: [modo:items] [plugin modo:items] the bundle has errors (reported above), so the site was not written
  ```

  Scroll up for the errors. Warnings never fail a build.

## [modo:bundle]

The shared build: every item, every `shell` / `panel` / `logo` module and the `examples` module are entries of one esbuild build.

### Compile errors

```
[modo:bundle] 1 error(s) — skipped: items/primitives/badge
✘ [ERROR] Could not resolve "nope-pkg"

    primitives/badge/index.tsx:1:14:
      1 │ import x from 'nope-pkg'
        ╵               ~~~~~~~~~~

    in: items/primitives/badge
```

An entry failed to compile. modo finds the entries that fail on their own, drops them, and builds the rest. `skipped:` lists the dropped entries by key (`items/<tier>/<id>`, `usr/<path>` for shell and panel modules, `examples/<tier>/<id>` for an `examples.mdx`, `scope/examples`). `in:` lists every entry the error touched, so a broken shared module is reported once.

Fix the source and save; dev rebuilds.

### Errors

| Message | Meaning |
| --- | --- |
| `error: modo.config: …` | The config didn't load or validate. Items still build in dev. Run `modo check` for the full error. |
| `error: <path>: another <tier> item is already named "<id>"; skipped` | Two items in one tier share a folder name, in different groups. Ids are unique per tier. Rename one. |
| `error: <tier>/<id>: index.tsx has no default export` | The item compiled but exports no default. |
| `error: examples module "<path>" not found (resolved from <root>)` | The [`examples`](./config.md#examples) path doesn't resolve. |

### Warnings

| Message | Meaning |
| --- | --- |
| `warning: <tier>/<id>: No type literal found on parameter` | The parser found no props type, so there's no props table. An item with no props at all gets this too; it is harmless. |
| `warning: <tier>/<id>: Could not find object type literal` | The props type is a name that isn't an `interface` or object `type` in the same file (an import, a `ComponentProps<…>`). Declare it in `index.tsx` to get a table. See [items.md](./items.md#props). |
| `warning: <tier>/<id>: No \`export default\` found` | The parser found no `export default`. |
| `warning: <tier>/<id>: {@include ./x.md}: file not found` | An include path is wrong. Paths are relative to `index.tsx`. |
| `warning: <tier>/<id>: @example include not found: x.mdx` | The `@example {@include …}` file is missing. |
| `warning: examples export "X" collides with the item "X"` | An `examples` export has an item's name. The item wins; alias the export. |
| `warning: SHARED BUILD DISABLED — …` | The combined build failed but no single entry reproduces the error. Every entry is bundled on its own, so modules shared between items (contexts, providers) are duplicated. Look at the error printed with it. |
| `warning: could not clean .modo-tmp/build: …` | Stale outputs couldn't be deleted. Usually harmless; delete `.modo-tmp/` by hand. |

## [modo:shell]

Shell slot resolution. These are warnings; the site still builds.

| Message | Meaning |
| --- | --- |
| `Plain fallbacks for Code, Icon, …: no item matches by name and required props, and modo.config.ts \`shell\` pins none` | Those slots use the lib's plain HTML. That's fine. To fill one, add an item with the slot's name and props, or pin it. See [shell.md](./shell.md). |
| `Shell slot "X" is pinned to "<path>", which didn't load` | The `shell` path doesn't resolve, failed to compile, or the named export (`#Name`) doesn't exist. The slot falls back to matching. |
| `panel item "<label>" component "<path>" could not be resolved` | Same, for a [`panel`](./config.md#panel) entry. The entry is left out. |
| `logo "<path>" could not be resolved` | Same, for a component [`logo`](./config.md#logo). |

## CLI errors

| Message | Fix |
| --- | --- |
| `modo config not found at <path>` | Run the CLI from the project root, or pass `--config <file>`. |
| `Cannot resolve "@justanarthur/modo" while loading modo.config.ts` | Install dependencies (`bun install` or `npm install`). |
| A list of Zod issues (`Unrecognized key(s) in object`, `base starts and ends with \`/\``, `Invalid url`) | The config doesn't match the schema. See [config.md](./config.md). |
| `modo: vite extension at <path> must default-export a function` | Fix the [`vite`](./config.md#vite) module's default export. |
| `Port 5173 is already in use` | Another server holds the port. Set `MODO_PORT=5180 modo dev`. |

Set `MODO_DEBUG=1` to print stack traces with CLI errors.

## In the browser

- `[modo] example failed to compile:` in the console: an inline `@example` isn't valid JSX. Its stage stays empty; Show code still shows the source.
- `[modo] example failed:` or `[modo] example failed to render:`: an example threw. Its stage stays empty and the rest of the page works.

## Other gotchas

- **`npx modo` runs the wrong package** outside a project. The unscoped `modo` on npm is someone else's. Use `npx @justanarthur/modo init`; inside a project with modo installed, `npx modo` and `bunx modo` run the local CLI.
- **`.modo-tmp/`** is modo's build cache next to your config. Add it, and `dist/`, to `.gitignore`.
- **Classes from examples are missing** with Tailwind or UnoCSS: the scanner must include `.mdx` files.
- **A new file doesn't show up** in dev: modo rebuilds on source changes anywhere in the project. If a CSS tool still misses it, restart `modo dev`.
