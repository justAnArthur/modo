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
├── modo.config.ts       # site config (name, tokens, source, theme)
├── package.json
├── tsconfig.json
├── tokens/              # design tokens (colors, surfaces, typography, spacing, radius, motion)
├── primitives/          # smallest UI atoms (button, input, badge, ...)
├── components/          # composed UI (popover, tooltip, dialog, ...)
└── blocks/              # full UI sections (login-form, header, footer, ...)
```

every primitive, component, and block exports a default `Component`, plus
`meta`, `props`, and `examples` — modo reads those to render the docs site
automatically.

## extending

```bash
modo add primitive my-button   # scaffolds primitives/my-button/index.tsx
modo add component my-toast    # scaffolds components/my-toast/index.tsx
modo add block my-hero         # scaffolds blocks/my-hero/index.tsx
modo add token colors           # scaffolds tokens/colors.ts (if missing)
```

then edit the generated file, fill in the examples and the props, and
the docs site picks it up — no story file, no config.
