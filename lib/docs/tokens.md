# Tokens

Tokens are plain CSS custom properties in `tokens/*.css`. modo injects every file, in file-name order, and renders them on the Foundations pages (`/docs/tokens/<group>`) as swatches, scales and previews.

## File naming

There are five groups: `colors`, `typography`, `spacing`, `radius`, `motion`. You can split them two ways.

**One file per group.** A file named for a group owns its vars:

```
tokens/
├── colors.css
├── typography.css
├── spacing.css
├── radius.css
└── motion.css
```

**Var prefixes.** A var whose name has a known prefix goes to that group, whatever file it is in:

| Group | Prefixes | Bare shorthands |
| --- | --- | --- |
| spacing | `--space-`, `--spacing-` | `--space`, `--spacing` |
| radius | `--radius-` | `--radius` |
| motion | `--motion-`, `--duration-`, `--ease-` | `--motion`, `--duration`, `--ease` |
| typography | `--font-`, `--text-`, `--leading-`, `--tracking-` | `--font` |
| colors | anything else | |

The rules combine:

- In a group file, an unprefixed var belongs to that group (`--sm` in `spacing.css` is spacing).
- A prefix that names another group wins (`--radius-sm` in `colors.css` is radius).
- In a file with any other name (`tokens/theme.css`), every var goes by its prefix, and an unprefixed one is a color.

Every declaration in a file counts, including those inside `.dark { … }` or `@media` blocks. Put your dark palette next to the light one:

```css
/* demo/design-systems/filled/tokens/colors.css */
:root {
  --bg: #fff;
  --fg: #111;
  --muted-foreground: #71717a;
  --border: #e4e4e7;
  --ring: #3b82f6;
}

.dark {
  --bg: #09090b;
  --fg: #f4f4f5;
  --muted-foreground: #a1a1aa;
  --border: #3f3f46;
  --ring: #60a5fa;
}
```

Colors resolve live in the browser, so the colors page follows the current theme. A `var(--x)` value is followed to the token it references when modo builds a swatch.

Add a token file with `modo add token <name>` (`tokens/<name>.css`).

## The generic contract

The chrome (sidebar, headings, prop tables, example cards) has no visuals of its own. It reads a small set of shadcn-named tokens from your project. Every one is optional: an unset token falls back to a default, or inherits.

### Colors

| Token | Used for | Without it |
| --- | --- | --- |
| `--border` | Dividers, table rules, frames. | `currentColor` at 15% |
| `--muted-foreground` | Secondary text. | `currentColor` at 60% |
| `--ring` | Focus ring. | `currentColor` |

modo reads them once at startup into `--modo-border`, `--modo-muted` and `--modo-ring`. A token may hold a full color (`#e4e4e7`, `oklch(…)`) or bare channels the way older shadcn themes do (`--border: 240 5.9% 90%`, used as `hsl(var(--border))`). Bare channels with a `%` are wrapped in `hsl()`, plain triplets in `rgb()`. The expression stays live, so a theme switch repaints the chrome.

### Type

| Token | Default |
| --- | --- |
| `--font-sans` | none: the chrome inherits the page's family |
| `--font-weight-medium` | `normal` |
| `--font-weight-semibold` | `bold` |
| `--font-weight-bold` | `bold` |

Per element role the chrome renders, you can set size, line-height, weight and color. Any subset works.

| Role | `--font-size-<role>` | `--line-height-<role>` | `--font-weight-<role>` | `--color-<role>` |
| --- | --- | --- | --- | --- |
| `h1` (page title) | `2rem` | inherits | `--font-weight-bold` | inherits |
| `h2` (section title) | `1.25rem` | inherits | `--font-weight-semibold` | inherits |
| `h3` | `1rem` | inherits | `--font-weight-semibold` | inherits |
| `h4` | inherits | inherits | `--font-weight-semibold` | inherits |
| `p` | inherits | inherits | inherits | inherits |
| `lead` | `1.125rem` | inherits | inherits | muted |
| `eyebrow` | `0.8125rem` | inherits | `--font-weight-medium` | muted |
| `sm` | `0.8125rem` | inherits | | |
| `xs` | `0.6875rem` | inherits | | |

The typography foundation page shows these roles as Elements.

### Radius, spacing, motion, layout

| Token | Default |
| --- | --- |
| `--radius-sm` | `4px` |
| `--radius-md` | `--radius`, else `8px` |
| `--radius-lg` | `--radius`, else `12px` |
| `--space-1` … `--space-6` | `4px`, `8px`, `12px`, `16px`, `24px`, `32px` |
| `--duration-fast` | none: no transition |
| `--modo-measure` | `72ch`, the prose line length. Set it directly. |

## Wiring the contract in global.css

Your design system probably names things its own way. Map the generic names to your tokens in your [`css`](./config.md#css) file, by reference only. Don't copy values: a reference keeps light and dark in sync.

```css
/* demo/design-systems/mui/global.css */
:root {
  --font-sans: var(--font-family);
  --font-size-h1: var(--text-h4);
  --font-size-h2: var(--text-h6);
  --font-size-h3: var(--text-body1);
  --font-size-lead: var(--text-body1);
  --font-size-eyebrow: var(--text-caption);
  --font-size-sm: var(--text-body2);
  --font-size-xs: var(--text-caption);
  --font-weight-medium: var(--text-h6-weight);
  --font-weight-semibold: var(--text-h6-weight);
  --font-weight-bold: var(--text-h4-weight);

  --border: var(--mui-palette-divider);
  --muted-foreground: var(--mui-palette-text-secondary);
  --ring: var(--mui-palette-primary-main);

  --space-1: var(--mui-spacing-0_5);
  --space-2: var(--mui-spacing-1);
  --space-3: var(--mui-spacing-1_5);
  --space-4: var(--mui-spacing-2);
  --space-5: var(--mui-spacing-3);
  --space-6: var(--mui-spacing-4);
}
```

A shadcn project already uses these names and needs no wiring. The chrome doesn't paint the page background or text color; set those on `body` yourself:

```css
body {
  margin: 0;
  background: var(--bg);
  color: var(--fg);
}
```
