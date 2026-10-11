/*
 * Local addition (not part of Fluid Functionalism): the docs stage of the
 * Progress page's fill. A Progress whose value steps through a list each time
 * its button is pressed, so the example stays hook-free.
 */

import { useState } from 'react'
import Button from '../button'
import Progress, { type ProgressProps } from './index'

interface StepDemoProps extends Omit<ProgressProps, 'value'> {
  /** The values, one per press; after the last it starts over. */
  values: number[]
}

export default function StepDemo({ values, ...props }: StepDemoProps) {
  const [at, setAt] = useState(0)

  return (
    <div className="flex w-80 items-end gap-3">
      <Progress {...props} value={values[at]} />
      <Button variant="tertiary" size="compact" onClick={() => setAt((at + 1) % values.length)}>
        Step
      </Button>
    </div>
  )
}
