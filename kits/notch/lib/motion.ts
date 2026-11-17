/*
 * The island's motion, on modo-ui's spring tiers: which tier moves the shape
 * between two states, the bubble's goo, and Apple's content swap (arriving
 * content sharpens and grows into place, leaving content blurs out).
 */

import { spring, springEnter } from '@justanarthur/modo-ui/lib/springs'
import type { Transition } from 'motion/react'
import type { IslandState } from './geometry'

type Tier = (typeof spring)[keyof typeof spring]

const SIZE: Record<IslandState, number> = { idle: 0, compact: 1, split: 1, flash: 2, expanded: 3 }
const TIER: Record<IslandState, Tier> = {
  idle: spring.moderate,
  compact: spring.moderate,
  split: spring.moderate,
  flash: spring.slow,
  expanded: spring.goo,
}

/** The bigger the move, the slower the tier: grow on the target's spring, shrink on the source's exit tween. */
export function shapeTransition(from: IslandState, to: IslandState): Transition {
  if (SIZE[to] >= SIZE[from]) return springEnter(TIER[to])
  return from === 'expanded' ? spring.slow.exit : TIER[from].exit
}

export const bubbleTransition = (detaching: boolean): Transition =>
  detaching ? springEnter(spring.goo) : spring.goo.exit

// Blur is a filter string a spring can't drive, so the swap tweens on a tier's
// duration, as modo-ui's icon swaps. At rest the filter is dropped (`none`, not
// `blur(0px)`): any filter keeps an offscreen buffer alive.
export const contentShown = { opacity: 1, scale: 1, filter: 'blur(0px)', transitionEnd: { filter: 'none' } }
export const contentHidden = { opacity: 0, scale: 0.94, filter: 'blur(6px)' }
export const contentEnter: Transition = {
  type: 'tween',
  duration: spring.slow.duration,
  ease: 'easeOut',
  delay: spring.fast.duration,
}
export const contentLeave: Transition = { type: 'tween', ...spring.fast.exit, ease: 'easeIn' }
