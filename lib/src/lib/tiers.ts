/** The item tiers, in the order the docs list them. */
export const TIERS = ['primitives', 'components', 'blocks'] as const
export type Tier = (typeof TIERS)[number]
