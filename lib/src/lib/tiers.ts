/** The item tiers, in the order the docs list them. */
export const TIERS = ['primitives', 'components', 'blocks', 'pages'] as const
export type Tier = (typeof TIERS)[number]

/** Blocks and pages are screen-sized: overviews give them whole rows and shrink them to fit. */
export function isScreenSized(tier: Tier): boolean {
  return tier === 'blocks' || tier === 'pages'
}
