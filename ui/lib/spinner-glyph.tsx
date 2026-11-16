/*
 * Local addition (not part of Fluid Functionalism): Button's loading glyph,
 * FF's figure-eight stroke, as one module for Button and Progress.Spinner.
 * The animation is CSS (`.spinner-glyph` in base.css, on `--duration-loop`).
 */

'use client'

import { useReduceMotion } from './reduced-motion'

/** The figure-eight stroke travelling on its loop; under reduced motion it breathes in place. Size it with `className`. */
export function SpinnerGlyph({ className }: { className?: string }) {
  const reduced = useReduceMotion()

  return (
    <svg aria-hidden className={className} viewBox="0 0 24 24" fill="none">
      <path
        d="M 12 12 C 14 8.5 19 8.5 19 12 C 19 15.5 14 15.5 12 12 C 10 8.5 5 8.5 5 12 C 5 15.5 10 15.5 12 12 Z"
        stroke="currentColor"
        strokeWidth="1.125"
        strokeLinecap="round"
        pathLength="100"
        className={reduced ? 'spinner-breathe' : 'spinner-glyph'}
      />
    </svg>
  )
}
