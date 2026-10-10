/*
 * Local addition (not part of Fluid Functionalism): the one reduced-motion
 * read for the morph layer and the liquid indicators.
 */

import { useReducedMotion, useReducedMotionConfig } from 'motion/react'

/**
 * Reduce motion when the OS asks for it or a surrounding `MotionConfig` does.
 * motion's `useReducedMotionConfig` alone follows the OS only under
 * `<MotionConfig reducedMotion="user">`; without that wrapper it defaults to
 * "never", so a page that sets none would animate for a user who turned
 * motion off.
 */
export function useReduceMotion() {
  const os = useReducedMotion() ?? false
  const config = useReducedMotionConfig() ?? false
  return os || config
}
