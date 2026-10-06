import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, presetWind4 } from 'unocss'

/*
 * UnoCSS config — the UnoCSS stand-in for Fluid Functionalism's Tailwind v4
 * setup (upstream `app/globals.css` §3 `@theme inline` + `@utility`,
 * mickadesign/fluid-functionalism @ b3587bdbd83fc66c2a6aae3817ffb856cb09260b,
 * MIT © 2026 Micka Touillaud).
 *
 * - presetWind4 is UnoCSS's Tailwind v4 preset. `dark: 'class'` emits
 *   `.dark .dark\:x`, the same "inside a .dark ancestor" contract as FF's
 *   `@custom-variant dark (&:is(.dark *))`; vite.ts puts the Theme panel's
 *   stored preference (or the OS one under 'system') on <html> as
 *   `.light` / `.dark`.
 * - Theme colors point straight at the CSS variables in tokens/colors.css and
 *   primitives/surface/surface.css. wind4 applies an opacity modifier to a
 *   var() color with color-mix(), so `bg-accent/12` works on the
 *   light-dark() tokens.
 * - The radius scale is wind4's default on purpose: shape-context pairs
 *   `rounded-lg` (8px) with JS pixel radii, so it must not follow `--radius`.
 * - `font.sans` / `font.mono` repeat the literals from tokens/typography.css
 *   instead of `var(--font-*)`: wind4 emits theme keys as same-named
 *   variables (`--font-sans`), and a self-reference would be a cycle.
 * - Sources are scanned from disk (`content.filesystem`) because items reach
 *   the browser pre-bundled by modo, and example code lives only in the raw
 *   TSDoc of each index.tsx or in the .mdx it includes. The pipeline include
 *   covers `.ts` too (the default pipeline skips it).
 */

const root = dirname(fileURLToPath(import.meta.url))
const sources = resolve(root, '{lib,primitives,components,blocks}/**/*.{ts,tsx,mdx}')
const chrome = resolve(root, 'modo.components.tsx')

const TYPE_ROLES = ['display', 'title', 'subtitle', 'body', 'caption', 'micro'] as const
const WEIGHTS = ['normal', 'medium', 'semibold', 'bold'] as const
const TIERS = ['fast', 'moderate', 'slow'] as const
const RADII = ['box', 'glyph'] as const

export default defineConfig({
  presets: [
    presetWind4({
      dark: 'class',
      preflights: { reset: true, theme: 'on-demand' },
    }),
  ],
  outputToCssLayers: true,
  content: {
    filesystem: [sources, chrome],
    pipeline: { include: [sources, chrome] },
  },
  theme: {
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
  },
  // Token utilities that bypass `theme`: wind4 would emit a theme key as the
  // same-named variable (`--radius-box`), a cycle with the token itself.
  rules: [
    // FF's type-scale role utilities (upstream `@utility text-display` …),
    // riding the --text-* tokens in tokens/typography.css; `-compact` is the
    // ladder's compact step.
    [
      new RegExp(`^text-(${TYPE_ROLES.join('|')})(-compact)?$`),
      ([, role, compact = '']) => ({ 'font-size': `var(--text-${role}${compact})` }),
      { autocomplete: `text-(${TYPE_ROLES.join('|')})` },
    ],
    // The Inter weight ladder (font-variation-settings, not font-weight).
    [
      new RegExp(`^weight-(${WEIGHTS.join('|')})$`),
      ([, weight]) => ({ 'font-variation-settings': `var(--weight-${weight})` }),
      { autocomplete: `weight-(${WEIGHTS.join('|')})` },
    ],
    // The motion tiers of tokens/motion.css as CSS durations and delays.
    [
      new RegExp(`^duration-(${TIERS.join('|')})(-exit)?$`),
      ([, tier, exit = '']) => ({
        '--un-duration': `var(--duration-${tier}${exit})`,
        'transition-duration': `var(--duration-${tier}${exit})`,
      }),
      { autocomplete: `duration-(${TIERS.join('|')})` },
    ],
    [
      new RegExp(`^delay-(${TIERS.join('|')})(-exit)?$`),
      ([, tier, exit = '']) => ({ 'transition-delay': `var(--duration-${tier}${exit})` }),
      { autocomplete: `delay-(${TIERS.join('|')})` },
    ],
    [
      new RegExp(`^rounded-(${RADII.join('|')})$`),
      ([, radius]) => ({ 'border-radius': `var(--radius-${radius})` }),
      { autocomplete: `rounded-(${RADII.join('|')})` },
    ],
  ],
})
