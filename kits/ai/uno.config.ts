import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import ui from '../../ui/uno.config'

// ui's theme, rules and sources, plus the kit's: its items, the pages and their mock data.
const sources = resolve(dirname(fileURLToPath(import.meta.url)), '{lib,components,blocks,pages,mock}/**/*.{ts,tsx,mdx}')
const pipeline = ui.content?.pipeline || undefined
const include = [pipeline?.include ?? []].flat()

export default {
  ...ui,
  content: {
    filesystem: [...(ui.content?.filesystem ?? []), sources],
    pipeline: { include: [...include, sources] },
  },
}
