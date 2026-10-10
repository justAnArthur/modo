import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, presetWind4 } from 'unocss'
import presetModoUi from './preset'

/*
 * UnoCSS config — the UnoCSS stand-in for Fluid Functionalism's Tailwind v4
 * setup. The theme and token utilities live in preset.ts (the preset the
 * package ships); this file adds what only the docs site and the prebuilt
 * dist/styles.css need.
 *
 * - presetWind4 is UnoCSS's Tailwind v4 preset. `dark: 'class'` emits
 *   `.dark .dark\:x`, the same "inside a .dark ancestor" contract as FF's
 *   `@custom-variant dark (&:is(.dark *))`; vite.ts puts the Theme panel's
 *   stored preference (or the OS one under 'system') on <html> as
 *   `.light` / `.dark`.
 * - Sources are scanned from disk (`content.filesystem`) because items reach
 *   the browser pre-bundled by modo, and example code lives only in the raw
 *   TSDoc of each index.tsx or in the .mdx it includes. The pipeline include
 *   covers `.ts` too (the default pipeline skips it): it filters both the
 *   filesystem scan and the sources modo hands Uno on a dev rebuild.
 */

const root = dirname(fileURLToPath(import.meta.url))
const sources = resolve(root, '{lib,primitives,components,blocks}/**/*.{ts,tsx,mdx}')
const chrome = resolve(root, 'modo.components.tsx')

export default defineConfig({
  presets: [
    presetWind4({
      dark: 'class',
      preflights: { reset: true, theme: 'on-demand' },
    }),
    presetModoUi(),
  ],
  outputToCssLayers: true,
  content: {
    filesystem: [sources, chrome],
    pipeline: { include: [sources, chrome] },
  },
})
