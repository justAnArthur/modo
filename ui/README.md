# @justanarthur/modo-ui

A React design system: [Fluid Functionalism](https://www.fluidfunctionalism.com)
(Base UI flavor) on UnoCSS, with a liquid morph layer on top. Motion springs, a
fluid hover highlight, a two-step size ladder and an eight-level elevated
surface system come from Fluid Functionalism; overlays that grow out of
whatever opened them, and indicators that melt between items, are local.

**Live docs:** https://justanarthur.github.io/modo/ui/ — every component with
its props and live examples, built with [modo](https://github.com/justAnArthur/modo).

## Install

```sh
npm install @justanarthur/modo-ui
```

React 18 or later is a peer dependency. Import from the package root, or one
item per subpath:

```tsx
import { Button, Switch } from '@justanarthur/modo-ui'
import Dialog from '@justanarthur/modo-ui/components/overlays/dialog'
```

Subpaths follow the docs' tiers and groups: `primitives/*`, `components/*`
(`components/button`, `components/inputs/select`, …) and `blocks/*`
(`blocks/sidebar-app`).

## Styles

The components are styled with utility classes. Take them prebuilt, or let
your own Tailwind or UnoCSS generate them from the package's `dist/`, so each
class is emitted once, beside your own. Pick one path.

### Prebuilt CSS

No CSS tooling needed. `styles.css` holds the reset, the tokens, the base
styles, the Inter variable font and every utility the components use:

```ts
import '@justanarthur/modo-ui/styles.css'
```

### Tailwind CSS v4

`tailwind.css` imports the tokens and base styles, adds `@source` for the
components, the `dark:` variant, the theme (`@theme inline`) and the token
utilities (`text-body`, `weight-medium`, `duration-fast`, …):

```css
@import "tailwindcss";
@import "@justanarthur/modo-ui/tailwind.css";
```

### UnoCSS

Add the preset next to `presetWind4`, and the components' classes through
`modoUiContent` (UnoCSS reads `content` from your config only, never from a
preset, so this part can't ship inside it):

```ts
// uno.config.ts
import presetModoUi, { modoUiContent } from '@justanarthur/modo-ui/unocss'
import { defineConfig, presetWind4 } from 'unocss'

export default defineConfig({
  presets: [presetWind4(), presetModoUi()],
  content: { inline: [modoUiContent] },
})
```

Then import the generated CSS and the tokens with the base styles:

```ts
import 'virtual:uno.css'
import '@justanarthur/modo-ui/base.css'
```

`@justanarthur/modo-ui/tokens.css` holds the CSS variables alone, for a host
that brings its own base styles.

## Theming and dark mode

Every color is a `light-dark()` token, so `color-scheme` picks the side. It
follows the OS until `<html>` (or any subtree) carries the `light` or `dark`
class. The `dark:` utilities match inside a `.dark` ancestor, so set the class
whenever you pin a scheme:

```ts
document.documentElement.classList.toggle('dark', dark)
document.documentElement.classList.toggle('light', !dark)
```

A subtree with its own class keeps that scheme (a dark preview card on a light
page).

To re-brand, override tokens after the package's stylesheet, on the same
selector the tokens use (`.light` / `.dark` subtrees re-declare them). Give a
color both sides with `light-dark()`:

```css
:root,
.light,
.dark {
  --brand: oklch(0.65 0.19 150);
  --brand-hover: oklch(0.6 0.19 150);
  --background: light-dark(oklch(0.99 0.005 150), oklch(0.2 0.01 150));
  --font-sans: "Geist Variable", ui-sans-serif, system-ui, sans-serif;
}
```

The tokens live in five groups: colors (`--background`, `--foreground`,
`--muted-foreground`, `--accent`, `--brand`, `--destructive`, `--status-*`,
`--syntax-*`, …), typography (`--font-sans`, `--text-<role>`,
`--weight-*`), motion (`--duration-*`), radius and spacing. The surface ladder
(`--surface-1…8`, `--shadow-1…8`) re-points per scheme. The docs'
Foundations pages list every one with its value.

## Next.js and React Server Components

- Every module with state, effects, handlers or browser APIs opens with
  `'use client'`, kept at the top of each built chunk, so the components work
  from Server Components (Next.js App Router) as client components. `cn` and
  the class tables stay server-safe.
- In a Server Component, use the named parts (`CardHeader`, `DialogContent`, …)
  rather than the dotted form (`Card.Header`): React can't read a property off
  a client module from the server. Both are exported; the dotted form works in
  client components.
- `pdfjs-dist` is an optional peer, used only for PDF thumbnails in
  `InputMessage` (`npm install pdfjs-dist`). It loads lazily on the first PDF
  attachment, and fetches its worker from `cdn.jsdelivr.net`. Without it, a
  PDF attachment shows the file icon and a console warning. Webpack-based
  builds (Next.js) resolve the dynamic import at build time, so there install
  `pdfjs-dist` or alias it to `false`.

## Hooks for your own components

The motion systems are exported, so components of your own move the way these
do (the docs' Morph page shows them):

| Export | What it does |
|---|---|
| `useMorph(open, origin, options)` | The morph engine: grows an overlay's surface from its source (the trigger, the press point, an edge) to its own box on a spring tier, with a liquid goo neck by default, and holds it through the exit. |
| `MorphSurface` | Renders a `useMorph` state: the goo-filtered shape, the surface's background and shadow, the content clipped by it. |
| `GooIndicator` | An indicator (a selection, a thumb) that travels between items' rects and melts like a drop of liquid on the way. |
| `useReduceMotion()` | The one reduced-motion read: the OS setting, or a `<MotionConfig reducedMotion>` asking for it. |
| `useControllableState(value, defaultValue, onChange)` | Controlled and uncontrolled state in one, Base UI style: controlled while `value` isn't `undefined`, reporting every change either way. |

## Credits

modo-ui is a port of [Fluid Functionalism](https://github.com/mickadesign/fluid-functionalism)
by Micka Touillaud / mickadesign, at commit
`b3587bdbd83fc66c2a6aae3817ffb856cb09260b`: MIT © 2026 Micka Touillaud, full
text in [`LICENSE.fluid-functionalism`](./LICENSE.fluid-functionalism). Every
vendored file keeps its provenance header.

The morph layer takes techniques from three more MIT projects:

| Project | Repository @ commit | License | What it contributes |
|---|---|---|---|
| beUI | `github.com/starc007/ui-components` @ `de52f337e520e7ee37749b36eb1c32df86137bcb` | MIT © 2026 Saurabh Chauhan, [`LICENSE.beui`](./LICENSE.beui) | the gooey popover's rect interpolation, rounded-rect path, source cutout and goo filter; the morphing search (idea only) |
| motion-primitives | `github.com/ibelick/motion-primitives` @ `120f64f6ca60348e251f929e9c81f11ccbe45eda` | MIT © 2024 ibelick, [`LICENSE.motion-primitives`](./LICENSE.motion-primitives) | the morphing popover and morphing dialog (trigger growing into the panel, shared parts) |
| Sileo | `github.com/hiaaryan/sileo` @ `9793f844349983e140cf33cebbb8f51626d41407` | MIT, [`LICENSE.sileo`](./LICENSE.sileo) | the goo blur as a share of the surface radius; the gooey toast |

Sileo declares MIT in its `package.json` but ships no LICENSE file, so
`LICENSE.sileo` is the standard MIT text naming the repository's owner.
beUI's and motion-primitives' are copied verbatim. Only visuals come from
these projects: Base UI keeps all behavior (positioning, focus, dismissal,
hover and tap, scroll lock).

The package itself is MIT ([`LICENSE`](./LICENSE)). How the port was done
(the upstream → local file map, every local modification, the Tailwind →
UnoCSS translation) is in [`PORTING.md`](https://github.com/justAnArthur/modo/blob/main/ui/PORTING.md)
in the repository.
