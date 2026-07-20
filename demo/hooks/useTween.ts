import { useEffect, useRef, useState } from 'react'

// rAF-driven tween. returns a value that animates from the previous target
// to the new target with the given duration + ease. used by the motion
// popovers to drive clip-path / opacity without pulling in framer-motion.
export function useTween(
  target: number,
  duration: number,
  ease: (t: number) => number,
): number {
  const [value, setValue] = useState(target)
  const valueRef = useRef(target)
  valueRef.current = target

  useEffect(() => {
    let raf = 0
    let start: number | null = null
    const from = valueRef.current
    const step = (now: number) => {
      if (start === null) start = now
      const t = Math.min((now - start) / duration, 1)
      const next = from + (target - from) * ease(t)
      setValue(next)
      if (t < 1) raf = requestAnimationFrame(step)
      else setValue(target)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
    // ease is stable by convention; SPRING lives at module scope.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, duration])

  return value
}

// easeOutBack — approximates framer-motion's spring(bounce). higher bounce
// = more overshoot. used as the default for both popover variants.
export const SPRING: (t: number) => number = (() => {
  const bounce = 0.28
  const c1 = 1.70158 + bounce * 2
  const c3 = c1 + 1
  return (t: number) => 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2)
})()
