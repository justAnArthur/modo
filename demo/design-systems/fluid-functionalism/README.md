# Fluid Functionalism showcase for modo

[Fluid Functionalism](https://www.fluidfunctionalism.com) (MIT License © 2026
Micka Touillaud / mickadesign — [repo](https://github.com/mickadesign/fluid-functionalism))
is an independent shadcn/ui registry layer: it is distributed ONLY as a
registry (the `@fluid` namespace, no npm package) and layers motion springs,
fluid hover, a two-step size context, an elevated surface ladder, and Inter
variable font-weight animation on top of a host shadcn theme. Because a modo
design system is self-contained, this package carries its OWN shadcn
foundation (tokens + Tailwind css) plus the @fluid components on top — both
pulled with the real shadcn CLI into a scratch app, then reorganized into
modo's discovery structure. Everything here is "host content" from the user's
project — the `modo` lib ships none of it.

## Provenance

All commands run with shadcn CLI **4.21.0** (`bunx shadcn@latest …`) inside
`demo/.scratch/fluid/` (a throwaway scaffold, not part of this package):

```sh
mkdir -p demo/.scratch/fluid && cd demo/.scratch/fluid
bunx shadcn@latest init -t vite -b radix -y --no-monorepo --css-variables -p nova -n fluid-scratch
# scaffolds fluid-scratch/ (vite react-ts), writes components.json:
#   style "radix-nova", baseColor "neutral", cssVariables true, iconLibrary lucide

cd fluid-scratch
bunx shadcn@latest registry add @fluid   # registers https://www.fluidfunctionalism.com/r/{name}.json

bunx shadcn@latest add @fluid/button @fluid/badge @fluid/select @fluid/card \
  @fluid/chat-message @fluid/thinking-indicator @fluid/input-group -y --overwrite
bunx shadcn@latest add @fluid/sidebar -y --overwrite        # sidebar-core + sidebar-menu + sidebar
bunx shadcn@latest add @fluid/input-message -y --overwrite  # the chat composer
```

The `-y --overwrite` flags are needed because `@fluid/button` overwrites the
scaffold's shadcn `button.tsx` (same filename, different component).

Besides the named components, the CLI pulled their shared system
dependencies automatically (each lands as its own registry item):
`tokens`, `springs`, `font-weight`, `utils`, `shape-context`, `size-context`,
`icon-context`, `surface-context`, `surface-classes`, `elevated`, `popup`,
`use-fluid-hover` (+ `fluid-hover-highlight`), `use-touch-primary`,
`use-keyboard-nav-gate`, plus `tooltip`, `scroll-area`, and `file-thumbnail`
as component-level deps. Every add also appends the @fluid tokens and
utility CSS to the scaffold's `src/index.css`.

Not vendored from the pull: `input-group` (its `input-group.tsx` is built on
Base UI's `Field`, which is not a dependency of this workspace — the chat
block uses the Base-UI-free `@fluid/input-message` composer instead) and the
scaffold's `theme-provider` (modo has no theme toggle of its own).

## Reorganization into modo structure

- `global.css` — the scaffold's `src/index.css` after the @fluid adds:
  `@import "tailwindcss"` + `tw-animate-css`, the vendored shadcn
  `@custom-variant` block (from the `shadcn` npm package's
  `dist/tailwind.css`, vendored because that package is not a dependency
  here), `@theme inline` (shadcn foundation + @fluid interaction states,
  surface ladder, elevation shadows), `@source` lines for the modo item
  dirs and `_fluid/`, the @fluid base layer (focus ring, shape-transition
  guard, shimmer text, scroll fades/dividers, thin scrollbars) and keyframes.
  Differences from the registry's stylesheet, all noted in the file header:
  `@fontsource-variable/geist` replaced with `@fontsource-variable/inter/opsz`
  (FF's own app runs on Inter Variable, and its font-weight ladder animates
  the wght AND opsz axes), the @theme-declared keyframes moved to top level
  (Tailwind v4 only emits `@theme` keyframes with a matching `--animate-*`
  utility, while these are referenced from plain CSS), and a duplicated
  `@property` pair dropped.
- `tokens/colors.css` — the raw `:root` / `.dark` blocks: the shadcn
  foundation (neutral oklch) plus the @fluid interaction states (`--hover`,
  `--active`, `--selected`, `--destructive-light`, `--overlay`,
  `--focus-ring`), surface ladder (`--surface-1…8`) and elevation shadows
  (`--shadow-1…8`, `--shadow-color`, dark-mode `--dm-*`).
- `tokens/radius.css` — the shadcn `--radius` var. (modo's prefix grouping
  files bare `--radius` under colors on the tokens page — known cosmetic
  limitation; the value applies regardless. FF's real corner system is the
  JS shape context: rounded 8px / pill 20px.)
- `tokens/typography.css` — `--font-sans: 'Inter Variable', …`.
- No `tokens/motion.css` — FF's motion is JS-only: the spring tiers
  (`fast` 80ms / `moderate` 160ms critically damped / `slow` 240ms with
  bounce 0.12, in `_fluid/springs.ts`) are framer-motion configs consumed by
  `motion/react`, not CSS custom properties. The only CSS-side motion values
  (80ms/180ms transitions in component classes) are hard-coded per class in
  the registry, not tokens.
- `_fluid/` — the shared @fluid system files listed above, imported
  relatively by the item dirs. Lives outside the `primitives/components/
  blocks` tiers so modo's item discovery ignores it.
- `primitives/<name>/` — vendored `<name>.tsx` + `index.tsx` modo adapter.
- `components/<name>/` — same shape. `select/index.tsx` implements modo's
  Select shell contract (`value` / `onChange` / `options`); `sidebar/`
  vendors the full @fluid sidebar compound (`sidebar.tsx`,
  `sidebar-core.tsx`, `sidebar-menu.tsx`) and `index.tsx` composes modo's
  Sidebar contract (Root + static `.Item` / `.Section`) over it:
  Root = `SidebarProvider` (persist off, shortcut off) + a
  non-collapsible `Sidebar` + `SidebarContent`; Item = `SidebarMenu` /
  `SidebarMenuItem` / `SidebarMenuButton asChild` anchor; Section =
  `SidebarGroup` + label. The registry ships the compound parts, not this
  Root/Item/Section API — the composition is ours.
- `blocks/chat/` — FF's signature conversation, composed here (the registry
  ships the parts, not the block): `ChatMessage` transcript +
  `ThinkingIndicator` + the vendored `@fluid/input-message` composer
  (`input-message.tsx`). Live: sending a message shows the thinking state
  and a canned reply.
- `vite.ts` — appends `@tailwindcss/vite` to the lib's Vite config via
  modo.config.ts's `vite` hook.
- `modo.config.ts` — `css`, `vite`, and `shell: { Panel: './components/card' }`
  (Button and Sidebar resolve by interface matching, Select by contract;
  Link and Code intentionally fall back to the lib's Plain components).

### Local modifications to vendored files

Unmodified as pulled except: `@/…` imports rewritten to relative paths;
`framer-motion` imports rewritten to `motion/react` (the workspace depends
on `motion@13`, framer-motion's package rename); `@radix-ui/react-*`
submodule imports rewritten to the unified `radix-ui` package;
`"use client"` directives dropped; `next/link` in card.tsx replaced with
plain anchors; and a handful of type-skew fixes for the workspace's pinned
deps (`@types/react` 18 ref typings, `noUncheckedIndexedAccess`, a newer
lucide-react major, and a lazy `pdfjs-dist` import that is not a workspace
dependency). Each file's header lists exactly what was touched.

## Run

```sh
cd demo/design-systems/fluid-functionalism
MODO_PORT=5202 bunx modo dev
```
