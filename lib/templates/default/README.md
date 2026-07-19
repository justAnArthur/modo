# __NAME__

a design system scaffolded by [modo-atomic-ui](https://github.com/modo-atomic-ui/modo-atomic-ui).

## quickstart

```bash
npm install
npm run dev        # start the docs site
npm run build      # pre-render to ./dist/client (static, deployable)
npm run check      # validate modo.config.ts + token files
```

## layout

```
.
├── modo.config.ts       # site config (name, description, css)
├── package.json
├── tsconfig.json
├── overrides.css        # your component visuals (consumed via modo.config.ts: css)
├── tokens/              # design tokens as .css files (one per group)
├── primitives/          # smallest UI atoms (button, input, badge, ...)
├── components/          # composed UI (popover, tooltip, dialog, ...)
└── blocks/              # full UI sections (login-form, header, footer, ...)
```

## tokens

one CSS file per group, by convention:

- `tokens/colors.css` — `--surface-1..8`, `--foreground`, `--accent`, etc.
- `tokens/spacing.css` — `--xxs`, `--xs`, `--sm`, `--md`, `--lg`, `--xl`, ...
- `tokens/radius.css`, `tokens/motion.css`, `tokens/shadows.css`, `tokens/typography.css`
- `tokens/surfaces.css` — can be empty; the lib synthesizes the 8 surface levels from `colors.css` + `shadows.css`

## items (primitives, components, blocks)

each item is a single `.tsx` file with a default-exported function. metadata is extracted from TSDoc — no separate `meta` / `props` / `examples` exports needed:

```tsx
/**
 * Triggers an action or event.
 *
 * @example
 * # Primary
 *
 * ```tsx
 * <Button variant="primary">Save</Button>
 * ```
 */
export default function Button({
  variant = 'primary',
  children,
}: {
  /** Visual style. @values primary, secondary, ghost */
  variant?: 'primary' | 'secondary' | 'ghost'
  children?: React.ReactNode
}) {
  return <button data-variant={variant}>{children}</button>
}
```

the lib extracts `name` (from the function name), `description` (from the JSDoc leading paragraph), `props` (from the function's first-param TS type literal + per-prop JSDoc), and `examples` (from each `@example` block).

## extending

```bash
modo add primitive my-button   # scaffolds primitives/my-button/index.tsx
modo add component my-toast    # scaffolds components/my-toast/index.tsx
modo add block my-hero         # scaffolds blocks/my-hero/index.tsx
modo add token colors           # scaffolds tokens/colors.css (if missing)
```

then edit the generated file, fill in the examples and the props, and the docs site picks it up — no story file, no config.
