/*
 * Local addition (not part of Fluid Functionalism): the docs stage of the
 * Button page's loading morph. A Button that loads for a moment when pressed,
 * so the example stays hook-free.
 */

import { useEffect, useState } from 'react'
import Button, { type ButtonProps } from './index'

interface LoadingDemoProps extends ButtonProps {
  /** How long a press keeps the button loading, in ms. */
  duration?: number
}

export default function LoadingDemo({ duration = 2000, ...props }: LoadingDemoProps) {
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!loading) return
    const timer = setTimeout(() => setLoading(false), duration)
    return () => clearTimeout(timer)
  }, [loading, duration])

  return <Button {...props} loading={loading} onClick={() => setLoading(true)} />
}
