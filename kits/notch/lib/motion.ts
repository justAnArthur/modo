/*
 * The notch app's one motion scale: four springs in `visualDuration` +
 * `bounce`, so a move reads the same whatever its distance, shared by the
 * island, its flash, the launcher and every widget. The kit writes no other
 * duration: everything that moves or waits reads a tier here.
 */

import type { Transition } from 'motion/react'
import type { IslandState } from './geometry'

/** A step on the scale, by the size of what moves. */
export type MotionTier = 'micro' | 'small' | 'medium' | 'large'

/** A spring on the scale: its visual length in seconds and its bounce. */
export interface MotionSpring {
  type: 'spring'
  visualDuration: number
  bounce: number
}

/**
 * The scale. `micro`: hover pills, tab highlights, toggles, icon swaps.
 * `small`: idle ↔ compact, wing content, popovers, launcher results.
 * `medium`: compact → flash, the split bubble's goo, the launcher pill's drop.
 * `large`: the open island and its snaps. Bounce stays at 0.15 or under on
 * anything bigger than a button.
 */
export const motionScale: Record<MotionTier, MotionSpring> = {
  micro: { type: 'spring', visualDuration: 0.12, bounce: 0 },
  small: { type: 'spring', visualDuration: 0.22, bounce: 0 },
  medium: { type: 'spring', visualDuration: 0.32, bounce: 0.12 },
  large: { type: 'spring', visualDuration: 0.4, bounce: 0.15 },
}

/** How much shorter a shrink is than the grow it undoes. */
const SETTLE = 0.8

/** A tier's shrink: the same spring, critically damped and a little shorter, so a collapse is never a cut. */
export const settle = (tier: MotionTier): MotionSpring => ({
  type: 'spring',
  visualDuration: motionScale[tier].visualDuration * SETTLE,
  bounce: 0,
})

/** A tier's visual length in ms, for a timer or a Web Animation. */
export const tierMs = (tier: MotionTier) => Math.round(motionScale[tier].visualDuration * 1000)

/** How long a two-press destructive button (Clear) stays armed after its first press, in ms. */
export const confirmWindow = 3000

/** Waits before a hover opens the island and before leaving it closes it, in ms. */
export const hoverDelay = { intent: 100, leave: 250 } as const

const SIZE: Record<IslandState, number> = { idle: 0, compact: 1, split: 1, flash: 2, expanded: 3 }
const TIER: Record<IslandState, MotionTier> = {
  idle: 'small',
  compact: 'small',
  split: 'small',
  flash: 'medium',
  expanded: 'large',
}

/** Grow on the target state's tier; shrink on the source's, settled. */
export function shapeTransition(from: IslandState, to: IslandState): Transition {
  return SIZE[to] >= SIZE[from] ? motionScale[TIER[to]] : settle(TIER[from])
}

export const bubbleTransition = (detaching: boolean): Transition => (detaching ? motionScale.medium : settle('medium'))

// Blur is a filter string a spring can't drive, so the swap tweens over a
// share of the tier. At rest the filter is dropped (`none`, not `blur(0px)`):
// any filter keeps an offscreen buffer alive.
export const contentShown = { opacity: 1, scale: 1, filter: 'blur(0px)', transitionEnd: { filter: 'none' } }
export const contentHidden = { opacity: 0, scale: 0.96, filter: 'blur(4px)' }
/** Where leaving content goes: it fades and blurs in place, without the scale. */
export const contentGone = { opacity: 0, filter: 'blur(4px)' }

/** Content arriving: with the shape, no delay, over 60 % of `medium` (about 200 ms). */
export const contentEnter: Transition = {
  type: 'tween',
  duration: motionScale.medium.visualDuration * 0.6,
  ease: 'easeOut',
}

/** Content leaving: quick, opacity and blur only. */
export const contentLeave: Transition = { type: 'tween', duration: 0.1, ease: 'easeIn' }

/** Reduced motion: a plain crossfade on `micro`, no blur, no scale. */
export const contentFade: Transition = { type: 'tween', duration: motionScale.micro.visualDuration, ease: 'easeOut' }
