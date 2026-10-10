---
version: alpha
name: UI — Fluid Functionalism for modo
description: >-
  A quiet, neutral, dense interface where motion carries the meaning: springs instead of durations,
  one hover highlight that glides between rows, labels that get heavier without moving, eight nesting
  surface levels, and overlays that melt out of whatever opened them through a liquid neck. Light values
  are the plain token names; `-dark` twins are the dark scheme (every color is one light-dark() token in
  tokens/colors.css and primitives/surface/surface.css).
colors:
  primary: "oklch(0.205 0 0)"
  on-primary: "oklch(0.985 0 0)"
  background: "oklch(0.985 0 0)"
  background-dark: "oklch(0.205 0 0)"
  foreground: "oklch(0.205 0 0)"
  foreground-dark: "oklch(0.97 0 0)"
  card: "oklch(1 0 0)"
  card-dark: "oklch(0.264 0 0)"
  muted: "oklch(0.967 0.001 286.375)"
  muted-dark: "oklch(0.235 0 0)"
  muted-foreground: "oklch(0.556 0 0)"
  muted-foreground-dark: "oklch(0.7155 0 0)"
  accent: "oklch(0.922 0 0)"
  accent-dark: "oklch(0.439 0 0)"
  selected: "oklch(0.87 0 0)"
  selected-dark: "oklch(0.439 0 0)"
  border: "color-mix(in srgb, oklch(0.205 0 0) 12%, transparent)"
  border-dark: "color-mix(in srgb, oklch(0.97 0 0) 12%, transparent)"
  input: "oklch(0.922 0 0)"
  input-dark: "oklch(0.371 0 0)"
  control-border: "oklch(0.708 0 0)"
  control-border-dark: "oklch(0.556 0 0)"
  hover: "rgb(0 0 0 / 0.04)"
  hover-dark: "rgb(255 255 255 / 0.06)"
  active: "rgb(0 0 0 / 0.07)"
  active-dark: "rgb(255 255 255 / 0.1)"
  scrim: "oklch(0 0 0 / 0.4)"
  scrim-dark: "oklch(0 0 0 / 0.8)"
  brand: "oklch(0.693 0.16 265)"
  brand-hover: "oklch(0.649 0.164 264.76)"
  focus-ring: "oklch(0.693 0.16 265)"
  thumb: "oklch(1 0 0)"
  destructive: "oklch(0.6368 0.2078 25.33)"
  destructive-dark: "oklch(0.7106 0.1661 22.22)"
  destructive-light: "oklch(0.971 0.013 17.38)"
  destructive-light-dark: "oklch(0.2575 0.0886 26.04)"
  status-success: "oklch(0.723 0.192 149.58)"
  status-loading: "oklch(0.715 0 0)"
  status-warning: "oklch(0.7686 0.1647 70.08)"
  status-info: "oklch(0.623 0.188 259.81)"
  surface-1: "oklch(0.985 0 0)"
  surface-2: "oklch(0.991 0 0)"
  surface-3: "oklch(1 0 0)"
  surface-4: "oklch(1 0 0)"
  surface-5: "oklch(1 0 0)"
  surface-6: "oklch(1 0 0)"
  surface-7: "oklch(1 0 0)"
  surface-8: "oklch(1 0 0)"
  surface-1-dark: "oklch(0.205 0 0)"
  surface-2-dark: "oklch(0.235 0 0)"
  surface-3-dark: "oklch(0.264 0 0)"
  surface-4-dark: "oklch(0.293 0 0)"
  surface-5-dark: "oklch(0.321 0 0)"
  surface-6-dark: "oklch(0.349 0 0)"
  surface-7-dark: "oklch(0.375 0 0)"
  surface-8-dark: "oklch(0.402 0 0)"
typography:
  display:
    fontFamily: Inter Variable
    fontSize: 28px
    fontWeight: 700
    lineHeight: 34px
    fontVariation: "'wght' 700, 'opsz' 25"
  title:
    fontFamily: Inter Variable
    fontSize: 16px
    fontWeight: 550
    lineHeight: 22px
    fontVariation: "'wght' 550, 'opsz' 18"
  subtitle:
    fontFamily: Inter Variable
    fontSize: 14px
    fontWeight: 550
    lineHeight: 20px
    fontVariation: "'wght' 550, 'opsz' 18"
  body:
    fontFamily: Inter Variable
    fontSize: 13px
    fontWeight: 400
    lineHeight: 20px
    fontVariation: "'wght' 400, 'opsz' 14"
  body-selected:
    fontFamily: Inter Variable
    fontSize: 13px
    fontWeight: 550
    lineHeight: 20px
    fontVariation: "'wght' 550, 'opsz' 18"
  caption:
    fontFamily: Inter Variable
    fontSize: 12px
    fontWeight: 400
    lineHeight: 16px
    fontVariation: "'wght' 400, 'opsz' 14"
  caption-medium:
    fontFamily: Inter Variable
    fontSize: 12px
    fontWeight: 450
    lineHeight: 16px
    fontVariation: "'wght' 450, 'opsz' 15"
  micro:
    fontFamily: Inter Variable
    fontSize: 11px
    fontWeight: 400
    lineHeight: 14px
    fontVariation: "'wght' 400, 'opsz' 14"
  display-compact:
    fontFamily: Inter Variable
    fontSize: 24px
    fontWeight: 700
    lineHeight: 34px
    fontVariation: "'wght' 700, 'opsz' 25"
  title-compact:
    fontFamily: Inter Variable
    fontSize: 15px
    fontWeight: 550
    lineHeight: 22px
    fontVariation: "'wght' 550, 'opsz' 18"
  subtitle-compact:
    fontFamily: Inter Variable
    fontSize: 13px
    fontWeight: 550
    lineHeight: 20px
    fontVariation: "'wght' 550, 'opsz' 18"
  body-compact:
    fontFamily: Inter Variable
    fontSize: 12px
    fontWeight: 400
    lineHeight: 20px
    fontVariation: "'wght' 400, 'opsz' 14"
  caption-compact:
    fontFamily: Inter Variable
    fontSize: 11px
    fontWeight: 400
    lineHeight: 16px
    fontVariation: "'wght' 400, 'opsz' 14"
  micro-compact:
    fontFamily: Inter Variable
    fontSize: 10px
    fontWeight: 400
    lineHeight: 14px
    fontVariation: "'wght' 400, 'opsz' 14"
  code:
    fontFamily: ui-monospace
    fontSize: 12px
    fontWeight: 400
    lineHeight: 16px
rounded:
  glyph: 3px
  box: 5px
  md: 6px
  lg: 8px
  focus-ring: 10px
  xl: 12px
  2xl: 16px
  pill: 20px
  pill-focus-ring: 22px
  3xl: 24px
  full: 9999px
spacing:
  space-1: 4px
  space-2: 8px
  space-3: 12px
  space-4: 16px
  space-5: 24px
  space-6: 32px
  control: 36px
  control-compact: 28px
  segment-item: 28px
  segment-item-compact: 24px
  control-px: 12px
  control-px-compact: 10px
  row-px: 8px
  row-px-compact: 6px
  gap: 8px
  gap-compact: 4px
  icon: 16px
  icon-compact: 14px
  goo-neck: 12px
  measure: 45rem
components:
  button-primary:
    backgroundColor: "{colors.foreground}"
    textColor: "{colors.background}"
    typography: "{typography.body}"
    rounded: "{rounded.lg}"
    height: "{spacing.control}"
    padding: 0 16px
  button-primary-hover:
    backgroundColor: "color-mix(in srgb, oklch(0.205 0 0) 90%, oklch(0.985 0 0))"
  button-primary-active:
    backgroundColor: "color-mix(in srgb, oklch(0.205 0 0) 80%, oklch(0.985 0 0))"
  button-secondary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.foreground}"
    typography: "{typography.body}"
    rounded: "{rounded.lg}"
    height: "{spacing.control}"
    padding: 0 16px
  button-secondary-hover:
    backgroundColor: "color-mix(in srgb, oklch(0.922 0 0) 80%, oklch(0.985 0 0))"
  button-tertiary:
    textColor: "{colors.foreground}"
    rounded: "{rounded.lg}"
    height: "{spacing.control}"
    padding: 0 16px
  button-tertiary-hover:
    backgroundColor: "{colors.hover}"
  button-ghost:
    textColor: "{colors.muted-foreground}"
    rounded: "{rounded.lg}"
    height: "{spacing.control}"
  button-ghost-hover:
    backgroundColor: "{colors.hover}"
  button-compact:
    typography: "{typography.body-compact}"
    height: "{spacing.control-compact}"
    padding: 0 12px
  input-field:
    textColor: "{colors.foreground}"
    typography: "{typography.body}"
    rounded: "{rounded.lg}"
    height: "{spacing.control}"
    padding: 0 10px
  input-field-focus:
    backgroundColor: "{colors.card}"
  menu-popup:
    backgroundColor: "{colors.surface-3}"
    rounded: "{rounded.xl}"
  menu-row:
    textColor: "{colors.foreground}"
    typography: "{typography.body}"
    rounded: "{rounded.lg}"
    height: "{spacing.control}"
    padding: 0 8px
  hover-highlight:
    backgroundColor: "{colors.hover}"
    rounded: "{rounded.lg}"
  popover:
    backgroundColor: "{colors.surface-3}"
    rounded: "{rounded.xl}"
    padding: 16px
  dialog:
    backgroundColor: "{colors.surface-5}"
    rounded: "{rounded.xl}"
    padding: 24px
    width: 400px
  tabs-list:
    backgroundColor: "{colors.muted}"
    rounded: "{rounded.xl}"
    height: "{spacing.control}"
    padding: 4px
  tabs-indicator:
    backgroundColor: "{colors.surface-4}"
    rounded: "{rounded.lg}"
    height: "{spacing.segment-item}"
  tooltip:
    backgroundColor: "{colors.foreground}"
    textColor: "{colors.background}"
    typography: "{typography.caption-medium}"
    rounded: "{rounded.lg}"
    padding: 4px 8px
  badge:
    typography: "{typography.caption-medium}"
    rounded: "{rounded.lg}"
    height: 24px
    padding: 0 10px
  switch-track-on:
    backgroundColor: "{colors.brand}"
  switch-thumb:
    backgroundColor: "{colors.thumb}"
    rounded: "{rounded.full}"
  code-block:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.foreground}"
    typography: "{typography.code}"
    rounded: "{rounded.xl}"
    padding: 16px
---

# UI — Fluid Functionalism for modo

The `ui` design system: Fluid Functionalism (Base UI flavor, MIT © 2026 Micka Touillaud) on UnoCSS and
`cn`, plus a local morph layer that makes overlays and indicators liquid. The front matter holds the
normative values; the CSS custom properties in `tokens/*.css` and `primitives/surface/surface.css` are
the source they are copied from, and they win if the two ever disagree. Component code never writes
these values: it reads the utility that maps to each token (the class in backticks below).

## Overview

Functional first, then fluid. The interface is neutral, compact and quiet at rest, and almost every
pixel of personality is spent on *how things change*: a state change is always legible, never abrupt,
and never decorative.

- **Neutral, ink on paper.** Greyscale everywhere. The one chromatic accent, a cool blue (`brand`), is
  reserved for focus, "on" (switch track), drop targets and the selected swatch. Status hues appear only
  in toasts, badges and errors.
- **Dense, desktop-grade.** 13px body text, 36px controls, a 28px compact step for toolbars, tables and
  sidebars. Density is chosen per region (`SizeProvider`), never per control.
- **Hierarchy from size, weight and elevation**, not from color, borders, capitals or letter-spacing.
- **Motion is the signature.** Springs, not durations. One hover highlight per list that glides to the
  nearest row. Selection backgrounds that melt from item to item like a drop of liquid. Overlays that
  grow out of the control that opened them through a goo neck, then let go.
- **Calm under reduced motion.** Every effect degrades to a fade: fewer and gentler, never none.

The feeling to aim for: a precise instrument that happens to be made of liquid. Nothing bounces for
fun; the only overshoot in the system is the slow tier's 0.12 and the goo's 0.15.

## Colors

Two text colors, a greyscale ground, one blue.

- **Foreground (`text-foreground`)** — near-black ink in light, near-white in dark. Headings, labels,
  values, selected items, the primary button's fill.
- **Muted foreground (`text-muted-foreground`)** — the only secondary text color: descriptions, captions,
  placeholders, idle icons, idle tab labels. Never an opacity step of foreground (`text-foreground/60`
  is wrong); a third text tone does not exist.
- **Background (`bg-background`)** — the page, equal to surface 1. Also the text color on the primary
  button and the tooltip (`text-background`).
- **Surfaces (`bg-surface-1` … `bg-surface-8`)** — the elevation ladder (see Elevation & Depth). Prefer a
  surface level over `card`/`background` for anything that floats or nests.
- **Muted (`bg-muted`)** — a recessed track: the segmented tabs' well, a sunken field at rest.
- **Accent (`bg-accent`)** — the secondary button and the switch's off track. `selected` is a firmer
  grey for persistent selection fills.
- **Hover / Active (`bg-hover`, `bg-active`)** — translucent overlays (black 4% / 7% in light, white 6% /
  10% in dark) so they read on any surface level. Every hover and press fill uses them; never an ad-hoc
  grey. The raw tint direction is `--overlay` (`bg-overlay/8` → `rgb(var(--overlay) / 0.08)`).
- **Border (`border-border`, `ring-border`)** — 12% of foreground, so it tracks the scheme and nested
  forced scopes. Hairlines only, 1px.
- **Brand (`bg-brand`, `ring-focus-ring`)** — `focus-ring` is `brand`: every keyboard ring is a 1px blue
  ring 2px outside the element. The single theming point for focus.
- **Destructive (`text-destructive`, `bg-destructive-light`)** — errors and destructive confirms only.
- **Status (`text-status-*`, `bg-status-*/16`)** — success, loading, error, warning, info, action. A
  status shows as tinted text on a 16% wash of itself, never as a solid fill behind text.
- **Scrim (`bg-scrim`)** — behind a modal dialog; it fades with the morph's progress.
- **Syntax (`text-syntax-*`)** — low-chroma hues for code, so code reads as text first.

Every color is one `light-dark(light, dark)` token; the scheme comes from `color-scheme` on `<html>`
(`.light` / `.dark` pin it, also on any subtree). Shadows cannot ride `light-dark()`, so `--shadow-N` is
re-pointed per scheme in `surface.css`.

## Typography

**Inter Variable** with its optical-size axis (`@fontsource-variable/inter/opsz.css`). The opsz axis is
not optional: every weight is paired with an optical size so a label keeps its width when it gets
heavier.

Six roles, each a size and a whole-pixel line height, as utilities `text-<role>` (and
`text-<role>-compact` for the compact step, which keeps the role's leading):

| Role | Default | Compact | Use |
|---|---|---|---|
| `text-display` | 28/34 | 24 | The page title. The only bold text. |
| `text-title` | 16/22 | 15 | Section headings, dialog titles. |
| `text-subtitle` | 14/20 | 13 | Card and popover titles, emphasized rows. |
| `text-body` | 13/20 | 12 | Control labels, rows, body copy. The default. |
| `text-caption` | 12/16 | 11 | Descriptions, meta, errors, group labels, tooltips, badges. |
| `text-micro` | 11/14 | 10 | Keycaps, counters, tiny chips. Single line only. |

Body's 20px leading is what puts a padded row on the ladder: 8 + 20 + 8 = 36px.

Weights come from `font-variation-settings`, through the `weight-*` utilities, never `font-*`:

- `weight-normal` (400, opsz 14) — all running text and idle labels.
- `weight-medium` (450, opsz 15) — small labels that need to hold on a fill: tooltips, badges, errors.
- `weight-semibold` (550, opsz 18) — headings and anything selected, active or open.
- `weight-bold` (700, opsz 25) — the display role only.

A label that changes weight with state (a tab, a selected card title, an open accordion row) renders
twice in one grid cell: an invisible `weight-semibold` copy reserves the width, the visible copy tweens
`transition-[color,font-variation-settings] duration-fast`. Neighbours never move.

No uppercase, no letter-spacing, no eyebrows above titles in new UI (`Card.Eyebrow` is the one vendored
exception). Sentence case everywhere; the docs chrome capitalizes in content, not with CSS. Fixed-height
labels trim their box (`[text-box:trim-both_cap_alphabetic]`) so the cap height sits optically centered.
`h1–h3` balance, `p` wraps pretty. Code is `font-mono` at caption size.

## Layout

A 4px grid. Spacing tokens `--space-1…6` = 4, 8, 12, 16, 24, 32px (the docs chrome reads them);
component code uses the matching utilities (`gap-1`, `p-4`, …), which sit on the same 4px grid.

**The size ladder** is the layout system. Two steps only, and everything steps down together:

| Token (`useSize()`) | Default | Compact |
|---|---|---|
| `control` (buttons, inputs, select triggers, **and** list/menu rows) | 36px `h-9` | 28px `h-7` |
| `segmentItem` + `segmentPad` (segmented tabs) | 28 + 4 | 24 + 2 |
| `text` | `text-body` | `text-body-compact` |
| `px` (bounded controls) | 12px | 10px |
| `itemPx` (rows inside a padded popup) | 8px | 6px |
| `gap` (icon ↔ label, control ↔ control) | 8px | 4px |
| `icon` (glyphs, checkbox squares) | 16px | 14px |

A popup row is exactly as tall as the trigger that opened it. Density is a region decision: wrap the
region in one `SizeProvider size="compact"` and every control in it (menus it opens included) follows.
A component's own `size` prop wins over the provider.

Other fixed measures: popovers cap at `min(92vw, 20rem)`; dialogs are 400 / 540 / 880px wide (`sm`,
`lg`, `xl`), one notch narrower in compact regions; popup lists cap at `min(300px,
var(--available-height))` and scroll inside `ScrollArea` with a scroll-aware `scroll-fade`; reading
columns cap at `--modo-measure` (45rem). Native scrollbars are thin and low-contrast (overlay 8% → 12% on
hover → 16% while dragging), matching the `ScrollArea` thumb.

## Elevation & Depth

Eight surface levels that nest. Each `bg-surface-N` pairs 1:1 with a `shadow-surface-N`.

- **Light:** only two color steps (floor 0.985, sunken 0.991), then flat white from surface 3 up.
  Elevation is carried by shadow alone: a 1px `--shadow-color` hairline (black 6%) plus stacked drops
  whose offsets double per level (1, 3, 6, 12, 24, 48, 96px).
- **Dark:** an additive ladder from 0.205 to 0.402 in even steps, each with an inset top highlight, an
  inset ring and black drops.

Substrate flows through React context (`useSurface()`, 1 = the page). A floating surface computes
`min(substrate + offset, 8)`, paints that level and re-provides it, so a popover inside a dialog lands
above the dialog without any prop:

| Surface | Offset | Shadow |
|---|---|---|
| Code block | +1 | none |
| Popover, dropdown, select, combobox, context menu, preview card, toast, search suggestions | +2 | fixed `shadow-surface-3` |
| Tabs' active indicator | +3 | matches level |
| Dialog, alert dialog, sheet | +4 | matches level |
| Tooltip | inverted: `bg-foreground`, no shadow | — |

Menus keep a fixed `shadow-surface-3` whatever their depth, so a menu still reads as a menu three layers
down. Hover and pressed states are overlays (`bg-hover`, `bg-active`), not levels, so they work at any
elevation. Use `Elevated offset={n}` (or `surfaceClasses(level)` / `SURFACE_BG[level]`) for anything new
that floats; never hard-code a surface.

## Shapes

Rounded, concentric, never mixed. Two shape modes from `useShape()`; **rounded** is the default and what
everything renders without a provider:

| Slot | Rounded | Pill |
|---|---|---|
| `item`, `bg`, `button`, `input` | 8px `rounded-lg` | 20px |
| `focusRing` (2px outside the element) | 10px | 22px |
| `container` (popups, cards, dialogs, segmented tracks) | 12px `rounded-xl` | 24px |
| `mergedBg` (merged selection runs) | 8px | 16px |

A rounded surface nested close inside another uses concentric corners: inner = outer − inset − border.
The shipped pair (12 → 8) assumes a 4px inset. Small boxes use `rounded-box` (5px: checkbox squares,
keycaps) and `rounded-glyph` (3px). Thumbs, dots and the loading button are circles (`rounded-full`).
Never write a radius: read `shape.*` so the pill mode follows.

## Motion

Springs, tiered by the size of what moves. The bigger the thing, the slower the spring. Never a
hand-written duration; never a fourth speed.

| Tier | Enter | Exit (tween, one tier quicker) | Use |
|---|---|---|---|
| `spring.fast` | 80ms spring, bounce 0 | 60ms | Hover highlight, focus ring, fades, icon stroke, weight changes |
| `spring.moderate` | 160ms spring, bounce 0 | 120ms | Indicators, thumbs, small panels, width changes, the loading fold |
| `spring.slow` | 240ms spring, bounce 0.12 | 160ms | Large surfaces: plain morphs, the search field's growth, shared parts |
| `spring.goo` | 250ms visual, bounce 0.15 | 200ms spring back | Every goo morph, so the liquid neck is on screen long enough to read |

CSS consumers use `duration-fast|moderate|slow[-exit]` and `delay-*`. Animate `transform` and `opacity`;
a measured geometry engine (the morph layer, `GooIndicator`) is the only thing that writes boxes.

The signature behaviors:

- **Fluid hover.** One `bg-hover` highlight per list, on the item nearest the cursor (inside wins, else
  nearest center), so it never blinks off in a gap. It travels on `spring.fast` and melts between rows.
  A fresh pointer entry fades in where it is instead of sliding across. A click in a gap goes to the lit
  row: what is lit is what a click hits.
- **Liquid indicators.** Anything that travels between items (the active tab, a switch thumb, selection
  runs, the hover pill) leaves a blob behind that lingers a third of the spring and follows, melted
  through a goo filter. At rest nothing is filtered.
- **Morphing overlays.** Popover, dropdown, select, combobox, context menu, tooltip, preview card,
  dialog, sheet, command, search suggestions and toasts grow from their source (`from`: the trigger,
  the press point, the center, a window edge, or any element) with an `effect`: `goo` (default, a
  liquid neck that pinches off), `morph` (the box grows), `slide` or `fade`. They close back into where
  they came from. With `hideSource` the trigger *becomes* the panel.
- **Press geometry.** A pressed button's fill shrinks exactly 1px per side at any width (spread shadow
  collapse, not a scale), releasing slower than it presses.
- **Icons thicken, labels don't move.** Hovered/active icons step stroke 1.5 → 2 on the fast tier.
- **Loading folds.** A loading button folds its surface into a circle around the spinner while its box
  stays put.
- **Exits are crisp.** A dismissal never replays the entrance backwards.
- **Reduced motion.** Every morph becomes a fade; travel snaps; opacity and color fades stay.

## Components

Each item lives at `<tier>/[<group>/]<name>/index.tsx` and composes from Base UI (behavior) plus the
shared systems above (look and motion). Ready-made patterns to reach for before writing anything:

- **Buttons** — `primary` (ink fill), `secondary` (accent fill), `tertiary` (transparent, a 1px
  `border` ring that moves inward on press), `ghost` (transparent, muted text that turns foreground over
  the hover overlay). A component token with no `backgroundColor` is transparent over its substrate.
  Sizes `default` 36 / `compact` 28 / `icon` / `icon-compact`. Icons sit 4px closer to their edge than
  text. `active` holds the pressed look while a menu it opened is showing. One primary per view.
- **Inputs** — transparent and ringless at rest, a `bg-muted/50` wash plus a `ring-border` ring on
  hover, `bg-card` plus the ring on focus; the label sits above in muted body text. Errors: destructive caption at
  `weight-medium`, a `destructive-light` wash.
- **Lists and menus** — rows on the control height, `itemPx` inset, one fluid hover highlight, rows
  without their own `:hover` fill. Disabled rows stay registered but are skipped. Keyboard focus earns a
  1px brand ring that springs between rows; pointer focus never shows it.
- **Selection** — checkbox and radio rows melt their selected backgrounds into one run; tabs and
  subtle tabs carry an elevated (+3) or translucent indicator that melts between items; the selected
  label goes `weight-semibold`.
- **Overlays** — popup surfaces at +2 with `shadow-surface-3`, dialogs at +4, `rounded-xl` containers,
  12px goo neck between trigger and panel, content padding 16px (popover) or 24px (dialog).
- **Tooltips** — inverted (`bg-foreground` / `text-background`), caption at `weight-medium`, morph from
  the trigger, a hand-off between grouped tooltips is instant.
- **Badges** — 24px (20px compact), caption medium, a 15% wash of the color into the background with
  foreground text; dot variant keeps a neutral outline.
- **Toasts** — a status pill that melts into a body; status color as text on a 16% wash.
- **Cards** — transparent and borderless, inheriting the substrate; hairline dividers and the fluid
  hover do the framing; only clickable cards join the hover.

## Do's and Don'ts

- Do compose from an existing item before writing a new one; wrap rather than fork vendored code.
- Do read every visual from a token utility: `text-<role>`, `weight-*`, `bg-surface-N`,
  `shadow-surface-N`, `bg-hover`, `shape.*`, `duration-<tier>`, `spring.*`.
- Do lift floating surfaces relative to the substrate (`useSurface()` + offset) and re-provide the level.
- Do size controls from `useSize()` and let regions choose density with `SizeProvider`.
- Do give every list exactly one fluid hover highlight, and every traveling indicator a `GooIndicator`.
- Do grow every new overlay out of its source through `useMorph` + `MorphSurface`.
- Do test light, dark, compact, keyboard and reduced motion.
- Don't write an arbitrary value for color, type, radius, shadow or motion (`text-[13px]`, `bg-[#…]`,
  `rounded-[10px]`, `duration-[200ms]`); add the token instead. Layout geometry may be arbitrary.
- Don't use a third text color, an opacity step of a text color, uppercase, letter-spacing, or `font-*`
  weights.
- Don't add a per-row `:hover` background next to a fluid hover list.
- Don't hand-write a `duration`, an easing curve or a fourth spring; don't animate `top`/`left`/`width`/
  `height` outside the morph engine.
- Don't use the brand blue for anything but focus, "on", drop targets and selected swatches.
- Don't hard-code a surface background or a radius: a menu inside a dialog must still lift.
- Don't stack two measured-height animations: the outer one snaps when a child changed its size.
