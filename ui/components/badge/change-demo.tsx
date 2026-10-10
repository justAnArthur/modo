/*
 * Local addition (not part of Fluid Functionalism): the docs stage of the
 * Badge page's change morph. A Badge that steps through a list of props each
 * time its button is pressed, so the example stays hook-free.
 */

import { useState } from 'react'
import Button from '../button'
import Badge, { type BadgeProps } from './index'

interface ChangeDemoProps {
  /** The badge's props, one entry per press; after the last it starts over. */
  steps: BadgeProps[]
  /** Label of the button that steps. */
  label?: string
}

export default function ChangeDemo({ steps, label = 'Next' }: ChangeDemoProps) {
  const [at, setAt] = useState(0)

  return (
    <div className="flex items-center gap-3">
      <Button variant="tertiary" size="compact" onClick={() => setAt((at + 1) % steps.length)}>
        {label}
      </Button>
      <Badge {...steps[at]} />
    </div>
  )
}
