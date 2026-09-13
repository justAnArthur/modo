import type { Plugin } from 'vite'
import { resolve } from 'node:path'
import { loadModoConfig } from '../lib/config.loader'

interface Options {
  userRoot: string
}

const VIRTUAL_ID = 'virtual:modo-config'
const RESOLVED_ID = '\0virtual:modo-config'

export function configPlugin(options: Options): Plugin {
  return {
    name: 'modo:config',
    enforce: 'pre',
    resolveId(id) {
      if (id === VIRTUAL_ID) return RESOLVED_ID
      return null
    },
    async load(id) {
      if (id !== RESOLVED_ID) return null
      const configPath = process.env.MODO_CONFIG_PATH ?? resolve(options.userRoot, 'modo.config.ts')
      const cfg = await loadModoConfig(configPath)
      return [
        `export const config = ${JSON.stringify(cfg)};`,
        `export default config;`,
      ].join('\n')
    },
  }
}
