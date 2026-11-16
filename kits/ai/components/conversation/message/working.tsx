/*!
 * Ported from Fluid Functionalism — github.com/mickadesign/fluid-functionalism
 * `registry/default/thinking-indicator.tsx` @ b3587bdbd83fc66c2a6aae3817ffb856cb09260b
 * MIT License © 2026 Micka Touillaud (notice: LICENSE.fluid-functionalism). Local changes: see ui/PORTING.md
 * (ThinkingIndicator, folded into Message.Working).
 */

'use client'

import { GooFilter, useReduceMotion } from '@justanarthur/modo-ui'
import { spring } from '@justanarthur/modo-ui/lib/springs'
import { GOO_BLUR_RATIO } from '@justanarthur/modo-ui/lib/use-morph'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useId, useState } from 'react'

const WORDS = ['Thinking', 'Moonwalking', 'Planning', 'Refining']
const LONGEST = WORDS.reduce((a, b) => (a.length >= b.length ? a : b))

// `GAP` (between dot centers) is wide enough that split dots let go of each other through the goo.
const RADIUS = 2.5
const GAP = 9

// The merged blob holds the three dots' area, so it swells as they melt in.
const MERGED = Math.sqrt(3)

const SWAP_EASE = [0.4, 0, 0.2, 1] as const

/** Three dots that melt into one blob and split again, through the shared goo filter. */
function GooDots({ still }: { still: boolean }) {
  const gooId = `working-goo-${useId().replace(/:/g, '')}`
  // Eased, not sprung: a spring at this size settles too fast to see a neck form.
  const loop = { duration: spring.slow.duration * 8, ease: 'easeInOut' as const, repeat: Infinity }

  return (
    <span aria-hidden className="relative h-[18px] w-[23px] shrink-0">
      <GooFilter id={gooId} blur={RADIUS * GOO_BLUR_RATIO} />
      <span className="absolute inset-0 flex items-center justify-center" style={{ filter: `url(#${gooId})` }}>
        {[-1, 0, 1].map(side => (
          <motion.span
            key={side}
            className="absolute size-[5px] rounded-full bg-muted-foreground"
            animate={still ? { x: side * GAP } : side ? { x: [side * GAP, 0, side * GAP] } : { scale: [1, MERGED, 1] }}
            transition={still ? { duration: 0 } : loop}
          />
        ))}
      </span>
    </span>
  )
}

/** The word beside the dots, swapped every four seconds in the width of the longest. */
function CyclingWord({ still }: { still: boolean }) {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (still) return
    const interval = setInterval(() => setIndex(i => (i + 1) % WORDS.length), 4000)
    return () => clearInterval(interval)
  }, [still])

  return (
    <span aria-hidden className="inline-grid overflow-hidden text-body-compact weight-medium text-muted-foreground">
      <span className="invisible col-start-1 row-start-1">{LONGEST}</span>
      {still ? (
        <span className="col-start-1 row-start-1">{WORDS[0]}</span>
      ) : (
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={WORDS[index]}
            className="col-start-1 row-start-1"
            initial={{ y: '80%', opacity: 0 }}
            animate={{ y: 0, opacity: 1, transition: { duration: spring.slow.duration, ease: SWAP_EASE } }}
            exit={{ y: '-80%', opacity: 0, transition: { duration: spring.slow.exit.duration, ease: SWAP_EASE } }}
          >
            {WORDS[index]}
          </motion.span>
        </AnimatePresence>
      )}
    </span>
  )
}

interface WorkingProps {
  /** A short line beside the dots: what it is doing. */
  label?: string
}

/** The in-flight dots, for a reply that hasn't started or a turn still running. */
function Working({ label }: WorkingProps) {
  const still = useReduceMotion()
  return (
    <div role="status" className="flex items-center gap-2">
      <span className="sr-only">Thinking…</span>
      <GooDots still={still} />
      <CyclingWord still={still} />
      {label && <span className="text-caption text-muted-foreground">{label}</span>}
    </div>
  )
}

export type { WorkingProps }
export { Working }
