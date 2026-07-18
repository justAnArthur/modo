import { z } from 'zod'

// ── design tokens ─────────────────────────────────────────────────────────

export const tokenGroupSchema = z.enum([
  'colors',
  'surfaces',
  'typography',
  'spacing',
  'radius',
  'shadows',
  'motion',
])
export type TokenGroup = z.infer<typeof tokenGroupSchema>

export const semanticSchema = z.enum(['bg', 'fg', 'border', 'text', 'stroke', 'icon'])
export type Semantic = z.infer<typeof semanticSchema>

export const roleSchema = z.enum(['surface', 'text', 'stroke', 'brand', 'state', 'raw'])
export type Role = z.infer<typeof roleSchema>

// matches hex / rgb / rgba / hsl / hsla / oklch / oklab / color() / color-mix()
const colorValueSchema = z
  .string()
  .min(1)
  .refine(
    (v) =>
      /^#([0-9a-f]{3,8})$/i.test(v) ||
      /^rgba?\(/i.test(v) ||
      /^hsla?\(/i.test(v) ||
      /^oklch\(/i.test(v) ||
      /^oklab\(/i.test(v) ||
      /^color-mix\(/i.test(v) ||
      /^color\(/i.test(v) ||
      /^[a-z]+$/i.test(v), // named colors
    { message: 'value must be a valid color (hex, rgb, hsl, oklch, oklab, color(), color-mix(), or named)' }
  )

export const colorTokenSchema = z.object({
  value: colorValueSchema,
  semantic: semanticSchema,
  role: roleSchema,
  description: z.string().optional(),
})
export type ColorToken = z.infer<typeof colorTokenSchema>

export const colorGroupSchema = z.object({
  group: z.literal('colors'),
  description: z.string().optional(),
  items: z.record(z.string(), colorTokenSchema).refine(
    (items) => Object.keys(items).length > 0,
    { message: 'colors group must have at least one token' }
  ),
})
export type ColorGroup = z.infer<typeof colorGroupSchema>

// generic token group schema — used for typography, spacing, radius, motion.
// phase 1: structural validation only (group name + non-empty). phase 2 adds per-group shapes.
export const genericTokenGroupSchema = z.object({
  group: tokenGroupSchema,
  description: z.string().optional(),
}).passthrough()
export type GenericTokenGroup = z.infer<typeof genericTokenGroupSchema>

// ── surfaces (elevation model) ────────────────────────────────────────────

export const surfaceConventionSchema = z.object({
  offset: z.number().int().min(0).max(7),
  description: z.string().optional(),
})
export type SurfaceConvention = z.infer<typeof surfaceConventionSchema>

export const surfaceLevelSchema = z.object({
  bg: z.string().min(1),        // token name from colors.items
  shadow: z.string().min(1),    // token name from shadows.items
  description: z.string().optional(),
})
export type SurfaceLevel = z.infer<typeof surfaceLevelSchema>

export const surfaceGroupSchema = z.object({
  group: z.literal('surfaces'),
  description: z.string().optional(),
  levels: z.object({
    '1': surfaceLevelSchema,
    '2': surfaceLevelSchema,
    '3': surfaceLevelSchema,
    '4': surfaceLevelSchema,
    '5': surfaceLevelSchema,
    '6': surfaceLevelSchema,
    '7': surfaceLevelSchema,
    '8': surfaceLevelSchema,
  }),
  conventions: z.record(z.string(), surfaceConventionSchema).optional(),
})
export type SurfaceGroup = z.infer<typeof surfaceGroupSchema>

// ── primitives / components / blocks (item) ───────────────────────────────

export const propTypeSchema = z.enum(['enum', 'boolean', 'string', 'number', 'react-node'])
export type PropType = z.infer<typeof propTypeSchema>

export const propSchema = z.object({
  name: z.string().min(1),
  type: propTypeSchema,
  values: z.array(z.string()).optional(),
  default: z.union([z.string(), z.number(), z.boolean()]).optional(),
  description: z.string().optional(),
  required: z.boolean().optional(),
})
export type PropSchema = z.infer<typeof propSchema>

export const exampleSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  props: z.record(z.string(), z.unknown()).optional(),
  children: z.union([z.string(), z.number()]).optional(),
})
export type ExampleSchema = z.infer<typeof exampleSchema>

export const itemCategorySchema = z.enum(['primitives', 'components', 'blocks'])
export type ItemCategory = z.infer<typeof itemCategorySchema>

export const itemMetaSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  category: itemCategorySchema,
})
export type ItemMeta = z.infer<typeof itemMetaSchema>

export const itemSchema = z.object({
  meta: itemMetaSchema,
  props: z.array(propSchema).default([]),
  examples: z.array(exampleSchema).default([]),
})
export type ItemSchema = z.infer<typeof itemSchema>

// ── site config (modo.config.ts) ──────────────────────────────────────────

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
  tokens: z.object({ source: z.string() }).optional(),
  source: z.object({
    primitives: z.string(),
    components: z.string(),
    blocks: z.string(),
  }),
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
