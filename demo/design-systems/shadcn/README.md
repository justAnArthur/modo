# shadcn/ui showcase for modo

shadcn/ui (2026, Tailwind CSS v4, Radix flavor, neutral base color) pulled
with the real shadcn CLI into a scratch app, then reorganized into modo's
discovery structure. Everything here is "host content" from the user's
project — the `modo` lib ships none of it.

## Provenance

All commands run with shadcn CLI **4.21.0** (`bunx shadcn@latest …`) inside
`demo/.scratch/shadcn/` (a throwaway scaffold, not part of this package):

```sh
mkdir -p demo/.scratch/shadcn && cd demo/.scratch/shadcn
bunx shadcn@latest init -t vite -b radix -y --no-monorepo --css-variables -p nova -n shadcn-scratch
# scaffolds shadcn-scratch/ (vite react-ts), writes components.json:
#   style "radix-nova", baseColor "neutral", cssVariables true, iconLibrary lucide

cd shadcn-scratch
bunx shadcn@latest add button badge input label card select radio-group separator -y
bunx shadcn@latest add login-02 -y   # lightest login block (6 files, no card dep;
                                     # also pulls field, and label/separator as its deps)
```

The registry sources live under style `radix-nova` at `ui.shadcn.com`.
License: **MIT © Vercel Inc.** — https://ui.shadcn.com. Each vendored file
keeps a provenance header whose "Local modifications" line lists what changed:
`@/…` imports rewritten to relative paths for the modo layout, Biome
formatting, and modo docs (TSDoc, default exports, documented prop literals).

## Reorganization into modo structure

- `global.css` — the scaffold's `src/index.css`: `@import "tailwindcss"` +
  `tw-animate-css`, the `@custom-variant dark` + the vendored `data-*` custom
  variants (from the `shadcn` npm package's `dist/tailwind.css`, which the
  nova preset imports — vendored because that package is not a dependency
  here), `@theme inline`, base layer, and `@source` lines pointing at the
  modo item dirs. The Geist font `@import` stays (`@fontsource-variable/geist`
  is a dependency), so `--font-sans` is Geist Variable.
- `tokens/colors.css` — raw `:root` / `.dark` oklch variable blocks from the
  scaffold (the `--radius` line moved out).
- `tokens/radius.css` — the raw `--radius` variable.
- `primitives/<name>/` — the compound single-file pattern: the vendored file
  is renamed to `index.tsx` with TSDoc on the component and a default export
  (`button`, `badge`, `input`; no adapter).
- `primitives/link/` — authored for the showcase (shadcn ships no Link):
  `variant="link"` is a plain text link, the other variants reuse the
  Button's `buttonVariants()`. It is the chrome's Link and forwards the
  `aria-label` / `title` the chrome passes.
- `components/card/` — the compound single-file pattern: the vendored file is
  renamed to `index.tsx` with TSDoc on Card and the parts attached as static
  attributes (`Card.Header`, `Card.Title`, …; no adapter).
- `components/select/`, `components/radio-group/` — vendored `<name>.tsx` +
  `index.tsx` adapter; `select/index.tsx` implements modo's Select shell
  contract (`value` / `onChange` / `options`), radio-group maps `options` to
  generated items; both take `defaultValue` for uncontrolled use.
- `blocks/login-form/` — the pulled `login-02` block (`login-form.tsx`) with
  its block-local dependencies (`field.tsx`, `label.tsx`, `separator.tsx`)
  and the modo adapter `index.tsx`.
- `vite.ts` — appends `@tailwindcss/vite` to the lib's Vite config via
  modo.config.ts's `vite` hook.
- `_shell/icon.tsx` — not an item: maps the chrome's icon names onto lucide.
- `modo.config.ts` — `css`, `vite` and `shell: { Icon: './_shell/icon.tsx' }`
  (Button, Link, Select resolve by interface matching; Code and Sidebar
  intentionally fall back to the lib's Plain components).

## Run

```sh
cd demo/design-systems/shadcn
MODO_PORT=5201 bunx modo dev
```
