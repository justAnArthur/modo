/*
 * Vendored from the Fluid Functionalism registry (@fluid namespace,
 * fluidfunctionalism.com — MIT License © 2026 Micka Touillaud), pulled with
 * `bunx shadcn@latest add @fluid/font-weight.ts` (shadcn CLI 4.21.0) into a scratch
 * scaffold. Local modifications: `@/…` imports rewritten to relative paths for the modo layout; `framer-motion` imports rewritten to `motion/react`; `"use client"` directives dropped (non-RSC).
 */

export const fontWeights = {
  normal: "'wght' 400, 'opsz' 14",
  medium: "'wght' 450, 'opsz' 15",
  semibold: "'wght' 550, 'opsz' 18",
  bold: "'wght' 700, 'opsz' 25",
} as const;
