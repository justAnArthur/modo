// shared tier metadata. the lib has three atomic-design tiers; labels
// appear in the sidebar nav (plural) and in "not found" messages
// (singular). TIER_ORDER drives both sidebar order and the
// per-tier iteration in prerender helpers.

export const TIER_LABEL = {
  primitives: 'Primitives',
  components: 'Components',
  blocks: 'Blocks',
} as const

export const TIER_LABEL_SINGULAR = {
  primitives: 'primitive',
  components: 'component',
  blocks: 'block',
} as const

export const TIER_ORDER = ['primitives', 'components', 'blocks'] as const

export type Tier = (typeof TIER_ORDER)[number]
