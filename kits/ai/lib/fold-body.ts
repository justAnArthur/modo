/*!
 * Local addition: a folded body's lifetime. An Accordion keeps its panel
 * mounted through the close; a transcript with hundreds of folds can't
 * afford the bodies, so they render on open and unmount once the fold has
 * closed.
 */

'use client'

import { exitFallbackMs, spring } from '@justanarthur/modo-ui/lib/springs'
import { useEffect, useState } from 'react'

/** Whether a fold's body renders: from the render that opens it until its close (Accordion.Content's slow exit) has run. */
export function useFoldBody(open: boolean) {
  const [mounted, setMounted] = useState(open)
  if (open && !mounted) setMounted(true)

  useEffect(() => {
    if (open || !mounted) return
    const timer = setTimeout(() => setMounted(false), exitFallbackMs(spring.slow))
    return () => clearTimeout(timer)
  }, [open, mounted])

  return mounted
}
