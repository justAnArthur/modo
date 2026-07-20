// site config schema (modo.config.ts) — the only public schema we ship.
// the lib doesn't ship token or item schemas: tokens are .css files
// (validated lightly inside `modo check`) and items are .tsx files
// (parsed from JSDoc). defining zod schemas for them would be
// "default content" — see AGENTS.md ("libs are zero content defaults").

import { z } from 'zod'

export const siteConfigSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  logo: z
    .object({
      light: z.string().optional(),
      dark: z.string().optional(),
    })
    .optional(),
  meta: z
    .object({
      description: z.string().optional(),
      github: z.string().url().optional(),
    })
    .optional(),
  css: z.string().optional(),
  // user-supplied evaluable components the lib renders into known chrome
  // slots. paths resolve from the project root and require an extension
  // (e.g. './components/elevated.tsx'). missing files warn at startup
  // and fall through to a noop.
  admin: z
    .object({
      components: z
        .object({
          // a single React component used as both the page background
          // and the background behind each rendered example. sits
          // behind content via absolute positioning + pointer-events:
          // none — the user owns visual styling inside the component.
          elevated: z.string().optional(),
        })
        .optional(),
    })
    .optional(),
  // passthrough — full vite UserConfig. validated structurally by vite
  // at config-load time, not by the lib. see runtime/vite.config.ts
  // for the merge.
  vite: z.unknown().optional(),
})
export type SiteConfig = z.infer<typeof siteConfigSchema>
