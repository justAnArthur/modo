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
  // 'components' maps lib chrome slot names to user-provided component paths.
  // slots currently consumed: 'Select', 'Link', 'Button'. unset = native fallback.
  components: z.record(z.string(), z.string()).optional(),
  css: z.string().optional(),
  theme: z
    .object({
      fonts: z.record(z.string(), z.string()).optional(),
      defaultDensity: z.enum(['compact', 'comfortable', 'spacious']).default('comfortable'),
      defaultTheme: z.enum(['light', 'dark', 'system']).default('system'),
    })
    .optional(),
})
export type SiteConfig = z.infer<typeof siteConfigSchema>
