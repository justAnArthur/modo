import { z } from 'zod'

const componentRef = z.string()

export const shellSchema = z
  .object({
    Button: componentRef.optional(),
    Link: componentRef.optional(),
    Sidebar: componentRef.optional(),
    Panel: componentRef.optional(),
    Code: componentRef.optional(),
  })
  .strict()

export const siteConfigSchema = z
  .object({
    name: z.string(),
    description: z.string().optional(),
    shell: shellSchema.optional(),
    css: z.string().optional(),
  })
  .strict()

export type SiteConfig = z.infer<typeof siteConfigSchema>
export type ShellConfig = z.infer<typeof shellSchema>
