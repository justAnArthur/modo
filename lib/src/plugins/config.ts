import { resolve } from 'node:path'
import type { Plugin } from 'vite'
import { loadModoConfig } from '../lib/config.loader'
import { cssModule } from './css-module'

interface Options {
  userRoot: string
  configPath: string
}

const VIRTUAL_ID = 'virtual:modo-config'
const RESOLVED_ID = '\0virtual:modo-config'
const CSS_VIRTUAL_ID = 'virtual:modo-config-css'
const CSS_RESOLVED_ID = '\0virtual:modo-config-css'

export function configPlugin(options: Options): Plugin {
  return {
    name: 'modo:config',
    enforce: 'pre',
    resolveId(id) {
      if (id === VIRTUAL_ID) return RESOLVED_ID
      if (id === CSS_VIRTUAL_ID) return CSS_RESOLVED_ID
      return null
    },
    async load(id) {
      if (id !== RESOLVED_ID && id !== CSS_RESOLVED_ID) return null
      const cfg = await loadModoConfig(options.configPath)

      if (id === RESOLVED_ID) {
        return `export const config = ${JSON.stringify(cfg)};`
      }

      return cssModule(cfg.css ? [resolve(options.userRoot, cfg.css)] : [])
    },
  }
}
