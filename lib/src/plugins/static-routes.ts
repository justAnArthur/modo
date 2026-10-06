import type { Rollup } from 'vite'

// A static host has no SPA fallback but serves `<route>/index.html` for a deep
// link, so each route gets a copy of the built shell.
export function emitRoutes(ctx: Rollup.PluginContext, bundle: Rollup.OutputBundle, routes: string[]): void {
  const index = bundle['index.html']
  if (index?.type !== 'asset') return
  for (const route of routes) ctx.emitFile({ type: 'asset', fileName: `${route}/index.html`, source: index.source })
}
