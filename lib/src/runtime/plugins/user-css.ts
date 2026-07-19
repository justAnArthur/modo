// reads `modo.config.ts` once and exposes two virtual modules:
//   - virtual:modo-config         : the full config object (name,
//                                   description, theme, meta, components
//                                   map) for the layout and per-page
//                                   renderers
//   - virtual:modo-user-css       : a side-effect import of the CSS file
//                                   referenced from `config.css`. Vite
//                                   injects it as real CSS. if `config.css`
//                                   is unset, the module is empty (no import).
//
// if the user doesn't set `css`, the css module is a no-op. the config
// module exports an empty object so consumers can always destructure
// without nullish handling.

import type { Plugin } from 'vite'
import { resolve } from 'node:path'
import { loadModoConfig } from '../../exports/modo-config'

export interface UserCssPluginOptions {
  root: string  // user's project root
}

const VIRTUAL_CONFIG = 'virtual:modo-config'
const VIRTUAL_USER_CSS = 'virtual:modo-user-css'
const RESOLVED_CONFIG = '\0' + VIRTUAL_CONFIG
const RESOLVED_USER_CSS = '\0' + VIRTUAL_USER_CSS

export function userCssPlugin(options: UserCssPluginOptions): Plugin {
  return {
    name: 'modo-atomic-ui:user-css',
    enforce: 'pre',

    resolveId(id) {
      if (id === VIRTUAL_CONFIG) return RESOLVED_CONFIG
      if (id === VIRTUAL_USER_CSS) return RESOLVED_USER_CSS
      return null
    },

    async load(id) {
      const config = await loadModoConfig(options.root)
      if (id === RESOLVED_CONFIG) {
        return `export const config = ${JSON.stringify(config ?? {})};\nexport const name = ${JSON.stringify((config as { name?: string } | null)?.name ?? 'modo-atomic-ui')};\nexport const description = ${JSON.stringify((config as { description?: string } | null)?.description ?? '')};`
      }
      if (id === RESOLVED_USER_CSS) {
        const cssPath = (config as { css?: string } | null)?.css
        if (!cssPath) return ''
        return `import ${JSON.stringify(resolve(options.root, cssPath))};\n`
      }
      return null
    },
  }
}
