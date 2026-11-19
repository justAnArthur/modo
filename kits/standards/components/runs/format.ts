/*!
 * Local addition: the small formatters the run views share. Pure, so a
 * Server Component can read them.
 */

/** `640ms`, `4.2s`, `6m 12s`. */
export function duration(ms: number) {
  if (ms < 1000) return `${Math.round(ms)}ms`
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`
  const seconds = Math.round(ms / 1000)
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`
}

/** `1 tool call`, `3 tool calls`. */
export const plural = (n: number, noun: string) => `${n} ${noun}${n === 1 ? '' : 's'}`
