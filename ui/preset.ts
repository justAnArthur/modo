import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Preset } from 'unocss'

/*
 * The UI theme as a UnoCSS preset: the design system's own uno.config.ts
 * uses it, and so can a host app on UnoCSS (`@justanarthur/modo-ui/unocss`)
 * that generates the components' utilities itself instead of importing the
 * prebuilt styles.css. scripts/build-css.ts derives dist/tailwind.css from
 * the same `theme` and `utilities`, so the three never drift.
 *
 * Mirrors Fluid Functionalism's Tailwind v4 `@theme inline` + `@utility`
 * (upstream `app/globals.css` §3,
 * mickadesign/fluid-functionalism @ b3587bdbd83fc66c2a6aae3817ffb856cb09260b,
 * MIT © 2026 Micka Touillaud).
 *
 * - Requires presetWind4: the theme keys (`font`, `shadow`, `property`) are
 *   its shape, and its default `dark: 'class'` is the `.dark` ancestor
 *   contract the components are written against.
 * - Theme colors point straight at the CSS variables in tokens/colors.css and
 *   primitives/surface/surface.css. wind4 applies an opacity modifier to a
 *   var() color with color-mix(), so `bg-accent/12` works on the
 *   light-dark() tokens.
 * - The radius scale is wind4's default on purpose: shape-context pairs
 *   `rounded-lg` (8px) with JS pixel radii, so it must not follow `--radius`.
 * - `font.sans` / `font.mono` repeat the literals from tokens/typography.css
 *   instead of `var(--font-*)`: wind4 emits theme keys as same-named
 *   variables (`--font-sans`), and a self-reference would be a cycle.
 * - `utilities` bypass `theme` for the same reason (`--radius-box`).
 */

const TYPE_ROLES = ['display', 'title', 'subtitle', 'body', 'caption', 'micro'] as const
const WEIGHTS = ['normal', 'medium', 'semibold', 'bold'] as const
const TIERS = ['fast', 'moderate', 'slow'] as const
const RADII = ['box', 'glyph'] as const

export const theme = {
  font: {
    sans: "'Inter Variable', ui-sans-serif, system-ui, sans-serif",
    mono: "ui-monospace, 'SF Mono', SFMono-Regular, Menlo, Consolas, monospace",
  },
  colors: {
    background: 'var(--background)',
    foreground: 'var(--foreground)',
    card: { DEFAULT: 'var(--card)', foreground: 'var(--card-foreground)' },
    muted: { DEFAULT: 'var(--muted)', foreground: 'var(--muted-foreground)' },
    accent: {
      DEFAULT: 'var(--accent)',
      foreground: 'var(--accent-foreground)',
      hover: 'var(--accent-hover)',
    },
    brand: { DEFAULT: 'var(--brand)', hover: 'var(--brand-hover)' },
    'focus-ring': 'var(--focus-ring)',
    // The tint-direction triplet as a color, so `bg-overlay/8` is the
    // rgb(var(--overlay) / 0.08) ramp.
    overlay: 'rgb(var(--overlay))',
    selected: 'var(--selected)',
    thumb: 'var(--thumb)',
    picker: { edge: 'var(--picker-edge)', ring: 'var(--picker-ring)' },
    control: 'var(--control-border)',
    scrim: 'var(--scrim)',
    status: {
      success: 'var(--status-success)',
      loading: 'var(--status-loading)',
      error: 'var(--status-error)',
      warning: 'var(--status-warning)',
      info: 'var(--status-info)',
      action: 'var(--status-action)',
    },
    border: 'var(--border)',
    ring: 'var(--ring)',
    input: 'var(--input)',
    destructive: { DEFAULT: 'var(--destructive)', light: 'var(--destructive-light)' },
    hover: 'var(--hover)',
    active: 'var(--active)',
    syntax: {
      keyword: 'var(--syntax-keyword)',
      string: 'var(--syntax-string)',
      class: 'var(--syntax-class)',
      entity: 'var(--syntax-entity)',
      property: 'var(--syntax-property)',
      comment: 'var(--syntax-comment)',
      identifier: 'var(--syntax-identifier)',
      jsx: 'var(--syntax-jsx)',
      sign: 'var(--syntax-sign)',
    },
    surface: {
      1: 'var(--surface-1)',
      2: 'var(--surface-2)',
      3: 'var(--surface-3)',
      4: 'var(--surface-4)',
      5: 'var(--surface-5)',
      6: 'var(--surface-6)',
      7: 'var(--surface-7)',
      8: 'var(--surface-8)',
    },
  },
  // Arbitrary `transition-[a,b]` only accepts properties wind4 knows; FF
  // also tweens these two (icon stroke on hover, the Inter weight ladder).
  property: {
    'stroke-width': 'stroke-width',
    'font-variation-settings': 'font-variation-settings',
  },
  shadow: {
    'surface-1': 'var(--shadow-1)',
    'surface-2': 'var(--shadow-2)',
    'surface-3': 'var(--shadow-3)',
    'surface-4': 'var(--shadow-4)',
    'surface-5': 'var(--shadow-5)',
    'surface-6': 'var(--shadow-6)',
    'surface-7': 'var(--shadow-7)',
    'surface-8': 'var(--shadow-8)',
    thumb: 'var(--shadow-thumb)',
    'picker-thumb': 'var(--shadow-picker-thumb)',
    'picker-cursor': 'var(--shadow-picker-cursor)',
    swatch: 'var(--shadow-swatch)',
    'swatch-hover': 'var(--shadow-swatch-hover)',
    'swatch-selected': 'var(--shadow-swatch-selected)',
  },
  dropShadow: {
    'picker-cursor': 'var(--drop-shadow-picker-cursor)',
  },
}

export const utilities: Record<string, Record<string, string>> = Object.fromEntries([
  // FF's type-scale roles (upstream `@utility text-display` …), riding the
  // --text-* and --leading-* tokens in tokens/typography.css; `-compact` is
  // the ladder's compact step.
  ...TYPE_ROLES.flatMap(role =>
    ['', '-compact'].map(step => [
      `text-${role}${step}`,
      { 'font-size': `var(--text-${role}${step})`, 'line-height': `var(--leading-${role})` },
    ]),
  ),
  // The Inter weight ladder (font-variation-settings, not font-weight).
  ...WEIGHTS.map(weight => [`weight-${weight}`, { 'font-variation-settings': `var(--weight-${weight})` }]),
  // The motion tiers of tokens/motion.css as CSS durations and delays.
  ...TIERS.flatMap(tier =>
    ['', '-exit'].flatMap(step => [
      [
        `duration-${tier}${step}`,
        { '--un-duration': `var(--duration-${tier}${step})`, 'transition-duration': `var(--duration-${tier}${step})` },
      ],
      [`delay-${tier}${step}`, { 'transition-delay': `var(--duration-${tier}${step})` }],
    ]),
  ),
  ...RADII.map(radius => [`rounded-${radius}`, { 'border-radius': `var(--radius-${radius})` }]),
])

// In the published package this file is dist/preset.js beside the built
// components. A host's UnoCSS extracts their classes through
// `content: { inline: [modoUiContent] }` in its own config: the integrations
// read `content` from the user config only (never a preset's), and drop
// `filesystem` files their pipeline filter rejects, which has no `.js`. In the
// repo these dirs hold no .js, so the docs site scans the source itself.
const dist = dirname(fileURLToPath(import.meta.url))
const DIRS = ['shared', 'primitives', 'components', 'blocks']

export function modoUiContent(): string {
  return DIRS.map(dir => join(dist, dir))
    .filter(dir => existsSync(dir))
    .flatMap(dir =>
      readdirSync(dir, { recursive: true, encoding: 'utf8' })
        .filter(file => file.endsWith('.js'))
        .map(file => readFileSync(join(dir, file), 'utf8')),
    )
    .join('\n')
}

export function presetModoUi(): Preset {
  return { name: '@justanarthur/modo-ui', theme, rules: Object.entries(utilities) }
}

export default presetModoUi
