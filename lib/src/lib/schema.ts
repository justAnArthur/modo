import { z } from 'zod'

const componentRef = z.string()

export const shellSchema = z
  .object({
    Button: componentRef.optional(),
    Link: componentRef.optional(),
    Select: componentRef.optional(),
    Sidebar: componentRef.optional(),
    Code: componentRef.optional(),
  })
  .strict()

const panelItemSchema = z
  .object({
    label: z.string(),
    component: z.string(),
  })
  .strict()

export const siteConfigSchema = z
  .object({
    name: z.string(),
    description: z.string().optional(),
    shell: shellSchema.optional(),
    panel: z
      .object({
        items: z.array(panelItemSchema),
      })
      .strict()
      .optional(),
    css: z.string().optional(),
    // Path (relative to the project root) to a module that default-exports
    // `(config: UserConfig) => UserConfig | Promise<UserConfig>`. Applied to
    // the lib's Vite config before dev/build — e.g. to add @tailwindcss/vite.
    vite: z.string().optional(),
  })
  .strict()

export type SiteConfig = z.infer<typeof siteConfigSchema>
export type ShellConfig = z.infer<typeof shellSchema>
