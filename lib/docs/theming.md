# Theming the chrome

modo ships structure only: layout, grid, spacing rhythm, measure. Every visual comes from your project. You style the chrome three ways:

1. **Tokens.** The chrome reads the [generic contract](./tokens.md#the-generic-contract) (`--border`, `--font-size-h1`, `--radius-md`, …).
2. **Components.** Chrome slots render with your Button, Link, Code, Icon and Sidebar ([shell.md](./shell.md)).
3. **Hooks.** Every chrome element carries a `data-modo` attribute. Target it from your [`css`](./config.md#css) file.

Never fork or override the lib's CSS files. Restyle through the hooks.

## Restyling through data-modo

Your `css` file loads right after the chrome's structural CSS, so a rule of the same specificity wins.

```css
/* demo/design-systems/filled/global.css */
[data-modo="sidebar"] {
  border-right: 1px solid var(--border);
}

[data-modo="panel"] {
  border-left: 1px solid var(--border);
}
```

You can change layout too, not just looks:

```css
/* ui/global.css, trimmed */
:root {
  --modo-measure: 45rem;
}

[data-modo="content"] > * {
  max-width: var(--modo-measure);
  margin-inline: auto;
}

[data-modo="content"] {
  margin: var(--space-2);
  border-radius: var(--radius-xl);
  background-color: var(--surface-2);
  box-shadow: var(--shadow-2);
}

/* The lib drops the TOC below 1280px; keep it. */
[data-modo="toc"] {
  display: block;
}
```

Keep visuals on your own tokens here too, so the chrome follows light and dark.

### Built-in behavior

The lib already handles:

- The responsive grid: three columns from 1280px, the panel as a strip above the content below it (the table of contents hidden), everything stacked below 768px with the nav folded behind the menu toggle.
- Hover reveal of `example-actions`, `code-actions` and `anchor`: shown on hover or focus-within, always shown on touch screens.

## Hook reference

State attributes are listed in parentheses.

**Layout**

- `app`: the root grid.
- `sidebar` (`data-open` while the small-screen menu is open), `content`, `panel`.
- `header`, `brand`, `brand-logo`, `brand-name`, `header-actions`, `menu-toggle`: the brand row at the top of the sidebar.
- `footer`: the [`footer`](./config.md#footer) Markdown.

**Navigation**

- `sidebar-nav`, `sidebar-section`, `sidebar-section-title`, `sidebar-section-items`, `sidebar-item` (`aria-current="page"` when active). The `sidebar-*` hooks come from the Plain Sidebar; your own Sidebar sets its own markup.
- `toc`, `toc-label` (`data-level`): the "On this page" list.

**Page**

- `page-eyebrow`, `page-title`, `page-lead`, `prose`.
- `page-meta`, `page-meta-entry` (`data-kind="deprecated|status|since|repo|source|license"`): the [block tag](./items.md#block-tags) row.
- `section`, `section-title`, `anchor` (the `#` link in a heading).
- `hero`, `hero-stats`: the home page.

**Overviews**

- `bento`, `bento-card` (`data-span="wide|full"`), `bento-stage` (`data-clipped` when the preview is cut off), `bento-fit`, `bento-meta`, `bento-title`, `bento-count`, `bento-desc`, `bento-empty`.
- `token-preview`, `token-chip`.

**Examples and code**

- `example-card`, `example-card-title`, `example-card-frame`, `example-card-stage`, `example-actions`, `example-code`.
- `code-block`, `code-actions`.
- `icon-label`: the Plain Icon's text.

**Props and tokens**

- `prop-table-scroll`, `prop-table`.
- `token-list`, `token-row`, `token-name`, `token-meta`, `token-label`, `swatch` (`data-kind="length|duration|font-family|font-size|font-weight"`).

**Colors**

- `color-grid`, `color-stack`, `color-tile` (`data-flush` when it matches the page background), `color-tile-name`, `color-tile-value`, `color-tile-pair`.

**Foundations**

- Typography: `type-elements`, `type-element`, `type-families`, `type-family`, `type-family-sample`, `type-glyph`, `type-scale`, `type-step`, `type-sample`, `type-weights`, `type-weight`, `type-preview`.
- Radius: `radius-grid`, `radius-tile`, `radius-shape`.
- Spacing: `space-scale`, `space-step`, `space-bar`, `space-preview`.
- Motion: `motion-list`, `motion-row`, `motion-track`, `motion-dot`, `motion-curve`, `motion-preview`, `motion-bar`.

**Canvas** (`/canvas`)

- `canvas` (`data-moving`, `data-panning`, `data-space` while in use), `canvas-world`, `canvas-column` (`data-kind`: `foundations` or a tier), `canvas-frames`, `canvas-frame`, `canvas-frame-title`, `canvas-stage`, `canvas-controls`, `canvas-zoom`.

## Dark mode

Set [`theme`](./config.md#theme) to add a light / dark toggle to the header. The toggle:

- Writes the theme on `<html>`: a class by default (`class="dark"`), or an attribute you name.
- Runs before first paint, so there is no flash.
- Starts from the stored choice, else the OS preference, and stores the choice in `localStorage` under `modo-theme`.
- Sets `color-scheme` on `<html>` to match.
- Draws with your Button and the `sun` / `moon` [icons](./shell.md#icon).

`theme: {}` toggles a `dark` class. Put the dark values in a `.dark` block next to the light ones:

```ts
// modo.config.ts
theme: {},
```

```css
/* tokens/colors.css */
:root {
  --bg: #fff;
  --fg: #111;
  --border: #e4e4e7;
}

.dark {
  --bg: #09090b;
  --fg: #f4f4f5;
  --border: #3f3f46;
}
```

For a design system keyed on an attribute:

```ts
theme: { attribute: 'data-theme', dark: 'dark', light: 'light' },
```

```css
[data-theme="dark"] {
  --bg: #09090b;
}
```

The chrome reads its colors through live `var()` expressions, so it repaints with the page. A component that needs to react in script can listen for the `modo:themechange` event on `window`.

If your design system ships its own theme controller, leave `theme` unset and add your controller as a [panel item](./config.md#panel) instead, as `ui` does with its Theme panel.
