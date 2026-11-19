/*!
 * Local addition: what one check did on the way to its verdict, by its kind:
 * the requests and assertions, the reads, the script's output, the model's
 * transcript.
 */

'use client'

import Badge from '@justanarthur/modo-ui/components/data-display/badge'
import LogView from '@justanarthur/modo-ui/components/data-display/log-view'
import { cn } from '@justanarthur/modo-ui/lib/utils'
import type { AssertionLog, HttpRequestLog, ResultLog } from '../../../lib/types'
import StateCell from '../../status/state-cell'
import { duration } from '../format'
import RunTranscript from '../run-transcript'

const statusColor = (status: number) => (status < 300 ? 'green' : status < 400 ? 'amber' : 'red')

function Assertion({ target, expected, actual, pass }: AssertionLog) {
  return (
    <li className={cn('flex gap-2 rounded-lg px-2 py-1.5', !pass && 'bg-destructive-wash')}>
      <StateCell.Glyph state={pass ? 'pass' : 'fail'} size="small" className="mt-0.5" />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="break-words font-mono text-caption text-foreground">{target}</span>
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-caption">
          <dt className="text-muted-foreground">expected</dt>
          <dd className="m-0 min-w-0 break-words font-mono text-foreground">{expected}</dd>
          <dt className="text-muted-foreground">found</dt>
          <dd className={cn('m-0 min-w-0 break-words font-mono', actual ? 'text-foreground' : 'text-muted-foreground')}>
            {actual ?? 'nothing'}
          </dd>
        </dl>
      </div>
    </li>
  )
}

function Assertions({ assertions }: { assertions: AssertionLog[] }) {
  return (
    <ol className="flex flex-col gap-1">
      {assertions.map((assertion, index) => (
        <Assertion key={index} {...assertion} />
      ))}
    </ol>
  )
}

function Request({ url, final_url, status, ms, assertions }: HttpRequestLog) {
  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Badge size="compact" color={statusColor(status)}>
          {status}
        </Badge>
        <span className="min-w-0 flex-1 truncate font-mono text-caption text-foreground">GET {url}</span>
        <span className="shrink-0 text-caption text-muted-foreground tabular-nums">{duration(ms)}</span>
      </div>
      {final_url && <span className="truncate pl-2 font-mono text-caption text-muted-foreground">→ {final_url}</span>}
      <Assertions assertions={assertions} />
    </section>
  )
}

interface CheckLogProps {
  /** The log the engine recorded with the result. */
  log: ResultLog
  /** Classes for the root. */
  className?: string
}

/**
 * What a check did, step by step, so a verdict can be traced to what the
 * check saw.
 *
 * An http check lists each request (its status, URL, time and where the
 * redirects ended), then each assertion on it: what was read, what the item
 * expects and what was found, truncated. A repo or github check lists the
 * files and fields it read the same way. Failing assertions sit on the error
 * hue's wash, so the one that turned the cell red stands out. A script
 * check shows its output as printed (see LogView), an ai check the model's
 * session (see RunTranscript).
 *
 * @example {@include ./examples.mdx}
 */
export default function CheckLog({ log, className }: CheckLogProps) {
  if (log.kind === 'ai') return <RunTranscript items={log.transcript} className={className} />
  if (log.kind === 'script')
    return (
      <div className={cn('flex flex-col gap-2', className)}>
        <span className="font-mono text-caption text-muted-foreground">{log.file}</span>
        <LogView lines={log.lines} wrap label={`Output of ${log.file}`} />
      </div>
    )
  if (log.kind === 'http')
    return (
      <div className={cn('flex flex-col gap-5', className)}>
        {log.requests.map(request => (
          <Request key={request.url} {...request} />
        ))}
      </div>
    )
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <span className="truncate font-mono text-caption text-muted-foreground">{log.source}</span>
      <Assertions assertions={log.assertions} />
    </div>
  )
}

export type { CheckLogProps }
export { CheckLog }
