import { existsSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'

export function discoverCssForFile(filePath: string): string[] {
  const dir = resolve(filePath, '..')
  if (!existsSync(dir)) return []
  // Sorted: injection order is cascade order.
  return readdirSync(dir)
    .sort()
    .filter(f => f.endsWith('.css'))
    .map(f => resolve(dir, f))
}
