// resolves the optional `admin/components/elevated.tsx` convention
// file and exposes it through `virtual:modo-elevated`.
//
// the convention file is OPTIONAL — the user may not have one.
// the virtual module exports:
//   - default / Elevated: the user's component, or a `() => null` noop
//   - isProvided: boolean, true when the file exists
//
// `isProvided` lets the layout pick between the elevated chrome and
// the plain <main data-aui="content"> fallback when the user hasn't
// provided a component. without the flag the layout would have to
// inspect the component reference, which is fragile.
//
// the file is re-checked on every load() call, so creating the
// convention file in an already-running dev server picks up on the
// next request — no restart required. the user has to reload the
// page (it's a server-side virtual module; vite filters it from
// client HMR) but the change is otherwise live.

import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import type { Plugin } from 'vite'

const VIRTUAL = 'virtual:modo-elevated'
const RESOLVED = '\0' + VIRTUAL

export interface ElevatedPluginOptions {
  root: string  // user's project root
}

export function elevatedPlugin(options: ElevatedPluginOptions): Plugin {
  const target = resolve(options.root, 'admin/components/elevated.tsx')

  return {
    name: 'modo-atomic-ui:elevated',
    enforce: 'pre',

    resolveId(id) {
      if (id === VIRTUAL) return RESOLVED
      return null
    },

    load(id) {
      if (id !== RESOLVED) return null
      if (existsSync(target)) {
        return [
          `export { default } from ${JSON.stringify(target)}`,
          `export { default as Elevated } from ${JSON.stringify(target)}`,
          `export const isProvided = true`,
        ].join('\n') + '\n'
      }
      return [
        `const Elevated = () => null`,
        `export default Elevated`,
        `export const isProvided = false`,
      ].join('\n') + '\n'
    },
  }
}
