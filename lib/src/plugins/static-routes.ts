import type { Rollup } from 'vite'
import { headTags, type PageHead, withHead } from '../lib/head'
import type { SiteConfig } from '../lib/schema'

// A static host has no SPA fallback but serves `<route>/index.html` for a deep
// link, so each route gets a copy of the built shell, with its own head.
// `404.html` is what GitHub Pages and most static hosts serve for anything else.
export function emitRoutes(
  ctx: Rollup.PluginContext,
  bundle: Rollup.OutputBundle,
  site: SiteConfig,
  pages: PageHead[],
): void {
  const index = bundle['index.html']
  if (index?.type !== 'asset') return
  const html = String(index.source)
  for (const page of pages) {
    const fileName = page.path === '404' ? '404.html' : `${page.path}/index.html`
    ctx.emitFile({ type: 'asset', fileName, source: withHead(html, headTags(site, page)) })
  }
}
