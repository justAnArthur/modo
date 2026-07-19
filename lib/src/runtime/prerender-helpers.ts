// shared helpers used by per-page `+onBeforePrerenderStart.ts` hooks.
// imported by each per-page file in `pages/docs/**/+onBeforePrerenderStart.ts`.

import { readdir } from 'node:fs/promises'
import { join } from 'node:path'

export type Tier = 'primitives' | 'components' | 'blocks'

const TIERS: readonly Tier[] = ['primitives', 'components', 'blocks']

export async function listTokens(): Promise<string[]> {
  const demoRoot = process.env.MODO_DEMO_ROOT
  if (!demoRoot) return []
  const out: string[] = []
  try {
    const files = await readdir(join(demoRoot, 'tokens'))
    for (const f of files) {
      if (f.endsWith('.css')) out.push(f.replace(/\.css$/, ''))
    }
  } catch { /* no tokens dir */ }
  // surfaces is always synthesized by the lib from colors+shadow vars
  // (1..8 ladder, each with bg + shadow refs). the docs page renders
  // even when no surfaces.css file exists in the user's project.
  if (!out.includes('surfaces')) out.push('surfaces')
  return out
}

export async function listTier(tier: Tier): Promise<string[]> {
  const demoRoot = process.env.MODO_DEMO_ROOT
  if (!demoRoot) return []
  const out: string[] = []
  try {
    const entries = await readdir(join(demoRoot, tier), { withFileTypes: true })
    for (const entry of entries) {
      if (entry.isDirectory()) out.push(entry.name)
    }
  } catch { /* tier dir missing */ }
  return out
}

export { TIERS }
