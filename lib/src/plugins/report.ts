export interface Report {
  /** Preformatted lines, printed first (the bundler's grouped build errors). */
  lines?: string[]
  errors?: string[]
  warnings?: string[]
}

/**
 * Prints `[modo:<scope>]` reports to stderr. Rebuilds run on every source
 * change, so a report identical to the previous one is not printed again.
 */
export function createReporter(scope: 'bundle' | 'shell'): (report: Report) => void {
  let previous = ''
  return ({ lines = [], errors = [], warnings = [] }) => {
    const text = [
      ...lines,
      ...errors.map(e => `[modo:${scope}] error: ${e}`),
      ...warnings.map(w => `[modo:${scope}] warning: ${w}`),
    ]
      .map(line => `${line}\n`)
      .join('')
    if (text && text !== previous) process.stderr.write(text)
    previous = text
  }
}
