// resolves the user's `admin.components.elevated` path (declared in
// modo.config.ts) and exposes it as the default export of
// `virtual:modo-elevated`. the lib imports this default in the
// layout and the example renderer, and renders it behind the page
// and behind each example-card-stage.
//
// if the field is unset, the virtual module exports a `() => null`
// noop so consumers can render unconditionally without nullish handling.
// if the field is set but the file can't be bundled, we warn and
// fall through to the same noop — the docs site should still boot
// even with a bad path.
//
// bundling the user's file with esbuild (via `bundleUserItem`) is
// the same path the items plugin takes for user primitives/components/
// blocks. it strips CSS imports and externalises react, so the result
// is a pure ESM .mjs the runtime can statically import.

import type { Plugin } from 'vite'
import { resolve } from 'node:path'
import { loadModoConfig } from '../../lib/config.loader'
import { bundleUserItem } from './_helpers'

export interface AdminPluginOptions {
  root: string  // user's project root
}

const VIRTUAL = 'virtual:modo-elevated'
const RESOLVED = '\0' + VIRTUAL

export function adminPlugin(options: AdminPluginOptions): Plugin {
  let cached: unknown = undefined
  const getConfig = async () => {
    if (cached === undefined) cached = await loadModoConfig(options.root)
    return cached
  }

  return {
    name: 'modo-atomic-ui:admin',
    enforce: 'pre',

    resolveId(id) {
      if (id === VIRTUAL) return RESOLVED
      return null
    },

    async load(id) {
      if (id !== RESOLVED) return null
      const config = await getConfig()
      const path = (config as { admin?: { components?: { elevated?: string } } } | null)
        ?.admin?.components?.elevated
      if (!path) {
        // no path configured — export a noop. the wrapper divs in
        // the layout / example renderer still render (empty), which
        // is harmless and keeps the data-aui hooks present for host
        // CSS.
        return `const Elevated = () => null\nexport default Elevated\nexport { Elevated }\n`
      }
      const abs = resolve(options.root, path)
      const bundled = await bundleUserItem(abs, { prefix: 'modo-elevated' }).catch((e) => {
        console.warn(`[modo-atomic-ui] admin.components.elevated: failed to bundle ${path} (${(e as Error).message}) — using noop`)
        return null
      })
      if (!bundled?.path) {
        console.warn(`[modo-atomic-ui] admin.components.elevated: ${path} could not be bundled — using noop`)
        return `const Elevated = () => null\nexport default Elevated\nexport { Elevated }\n`
      }
      return `export { default } from ${JSON.stringify(bundled.path)}\nexport { default as Elevated } from ${JSON.stringify(bundled.path)}\n`
    },
  }
}
