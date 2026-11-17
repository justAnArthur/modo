/*!
 * Local addition: a usage limit read against time — a Meter line whose tone
 * is whether the limit lasts until its reset (see pace.ts) and whose marker
 * is where an even spend would be by now.
 */

import Meter, { type MeterTone } from '@justanarthur/modo-ui/components/feedback/meter'
import type { LimitPace, Verdict } from './pace'

const TONE: Record<Verdict, MeterTone> = { free: 'default', watch: 'warning', tight: 'error' }

/** The used share, colored by verdict, with a tick at the even-pace share. */
export function PaceBar({ pace, className }: { pace: LimitPace; className?: string }) {
  return (
    <Meter
      variant="line"
      label={pace.limit.label}
      value={pace.limit.value}
      marker={pace.elapsed}
      tone={TONE[pace.verdict]}
      className={className}
    />
  )
}
