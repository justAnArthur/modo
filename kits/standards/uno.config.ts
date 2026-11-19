import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import ui from '../../ui/uno.config'

// ui's theme, rules and sources, plus the kit's (its items, the pages and their mock data) and the ai kit's,
// whose Transcript the run views render.
const here = dirname(fileURLToPath(import.meta.url))
const sources = [
  resolve(here, '{lib,components,blocks,pages,mock}/**/*.{ts,tsx,mdx}'),
  resolve(here, '../ai/{lib,components,blocks}/**/*.{ts,tsx}'),
]
const pipeline = ui.content?.pipeline || undefined
const include = [pipeline?.include ?? []].flat()

export default {
  ...ui,
  content: {
    filesystem: [...(ui.content?.filesystem ?? []), ...sources],
    pipeline: { include: [...include, ...sources] },
  },
}
