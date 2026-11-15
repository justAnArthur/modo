import { readFileSync } from 'node:fs'
import { extname, resolve } from 'node:path'
import type { Plugin } from 'vite'
import { headTags, themeScript, withHead } from '../lib/head'
import { isComponentRef } from '../lib/refs'
import { loadModoConfig } from '../node/config-loader'
import { cssModule, virtualModules } from './virtual'

interface Options {
  userRoot: string
  configPath: string
}

export function configPlugin(options: Options): Plugin {
  const modules = virtualModules('config')
  let base = '/'
  let build = false
  const load = () => loadModoConfig(options.configPath)

  return {
    name: 'modo:config',
    enforce: 'pre',
    configResolved(c) {
      base = c.base
      build = c.command === 'build'
    },
    resolveId: modules.resolveId,
    async load(id) {
      if (id !== modules.id && id !== modules.css) return null
      const cfg = await load()

      if (id === modules.id) {
        // An image logo goes through Vite's asset pipeline; a component logo is a shell module.
        const image = cfg.logo && !isComponentRef(cfg.logo)
        return [
          image
            ? `import logoUrl from ${JSON.stringify(`${resolve(options.userRoot, cfg.logo!)}?url`)};`
            : 'const logoUrl = null;',
          `export const config = ${JSON.stringify(cfg)};`,
          'export { logoUrl };',
        ].join('\n')
      }

      return cssModule(cfg.css ? [resolve(options.userRoot, cfg.css)] : [])
    },
    transformIndexHtml: {
      order: 'pre',
      async handler(html) {
        const cfg = await load()
        const favicon = cfg.favicon && resolve(options.userRoot, cfg.favicon)
        const href = favicon && (build ? `${base}favicon${extname(favicon)}` : `/@fs${favicon}`)
        const extra = [href && `<link rel="icon" href="${href}" />`, cfg.theme && themeScript(cfg.theme)].filter(
          Boolean,
        )
        return withHead(html, headTags(cfg, { path: '' })).replace(
          '</head>',
          () => `  ${extra.join('\n    ')}\n  </head>`,
        )
      },
    },
    async generateBundle() {
      const { favicon } = await load()
      if (!favicon) return
      const file = resolve(options.userRoot, favicon)
      this.emitFile({ type: 'asset', fileName: `favicon${extname(file)}`, source: readFileSync(file) })
    },
  }
}
