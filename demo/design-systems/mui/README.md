# MUI (modo showcase)

Material UI v9 presented through `modo`. Components are thin modo adapters
over the real `@mui/material` package; all visuals come from MUI's own emotion
styling and default theme. No Tailwind, no hand-written component CSS — only
generated tokens and the Roboto font import.

## Layout

```
modo.config.ts            name 'MUI', css './global.css'
global.css                @fontsource/roboto imports (300/400/500/700)
theme.tsx                 createTheme({ cssVariables: true }) + MuiProvider
scripts/extract-tokens.ts rerunnable token extraction (bun)
tokens/*.css              generated from MUI's default theme
primitives/               button, link, chip
components/               select, radio-group, switch, text-field, panel
blocks/                   login-form
```

## Tokens

`bun scripts/extract-tokens.ts` builds `createTheme({ cssVariables: true })`
(MUI's default light scheme) and writes:

- `tokens/colors.css` — `theme.vars.palette`, flattened. Every entry is
  `var(--mui-palette-<dashed-path>, <fallback>)`: the var name matches MUI's
  own CSS-variable naming exactly (`--mui-palette-primary-main`,
  `--mui-palette-grey-500`, `--mui-palette-background-default`, …) and the
  fallback is the real default value. `*Channel` entries (`r g b` triplets MUI
  keeps for internal color mixing) are skipped. 117 vars.
- `tokens/spacing.css` — `theme.spacing(n)` for n = 0–12 plus the half steps.
  With cssVariables on, spacing resolves through `var(--mui-spacing, 8px)`,
  so each step is n × 8px (`--space-1: 8px`, `--space-2: 16px`, …). 17 vars.
- `tokens/radius.css` — derived from `theme.shape.borderRadius` (4px):
  `sm` = 1u (buttons/inputs), `md` = 2u, `lg` = 4u (= Chip's 16px default),
  `full` = pill. 4 vars.
- `tokens/typography.css` — `--font-family` (the Roboto stack) and the type
  scale `--text-h1…h6, body1, body2, caption` with matching `*-weight` vars.
  19 vars.

The token files are data for modo's Foundations pages; MUI components at
runtime keep using their own theme (see `theme.tsx`). Adapters import
`@mui/material/*` subpaths directly — modo's item bundler (esbuild
`platform: 'browser'`) resolves MUI's full dependency graph, emotion included.

## Shell slots

Button (primitives), Link (primitives), Select (components) and Panel
(components) resolve via interface matching; Code and Sidebar intentionally
fall back to the lib's Plain components. The docs chrome passes
`variant="ghost" size="sm"` to Button — the adapter normalizes `ghost` →
`text` and `sm`/`md`/`lg` → `small`/`medium`/`large`.

## License

- Material UI: MIT — https://mui.com/getting-started/license/
- Roboto (via @fontsource/roboto): SIL Open Font License 1.1
- This showcase: MIT
