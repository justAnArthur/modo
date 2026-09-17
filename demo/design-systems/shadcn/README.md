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
keeps a provenance header; pulled code is unmodified except `@/…` imports
rewritten to relative paths for the modo layout.

## Reorganization into modo structure

- `global.css` — the scaffold's `src/index.css`: `@import "tailwindcss"` +
  `tw-animate-css`, the `@custom-variant dark` + the vendored `data-*` custom
  variants (from the `shadcn` npm package's `dist/tailwind.css`, which the
  nova preset imports — vendored because that package is not a dependency
  here), `@theme inline`, base layer, and `@source` lines pointing at the
  modo item dirs. The Geist font `@import` was dropped (not a dependency;
  `--font-sans` falls back to system sans).
- `tokens/colors.css` — raw `:root` / `.dark` oklch variable blocks from the
  scaffold (the `--radius` line moved out).
- `tokens/radius.css` — the raw `--radius` variable.
- `primitives/<name>/` — vendored `<name>.tsx` + `index.tsx` modo adapter.
- `components/<name>/` — same shape; `select/index.tsx` implements modo's
  Select shell contract (`value` / `onChange` / `options`).
- `blocks/login-form/` — the pulled `login-02` block (`login-form.tsx`) with
  its block-local dependencies (`field.tsx`, `label.tsx`, `separator.tsx`)
  and the modo adapter `index.tsx`.
- `vite.ts` — appends `@tailwindcss/vite` to the lib's Vite config via
  modo.config.ts's `vite` hook.
- `modo.config.ts` — `css`, `vite`, and `shell: { Panel: './components/card' }`
  (Button, Link, Select resolve by interface matching; Code and Sidebar
  intentionally fall back to the lib's Plain components).

## Run

```sh
cd demo/design-systems/shadcn
MODO_PORT=5201 bunx modo dev
```
