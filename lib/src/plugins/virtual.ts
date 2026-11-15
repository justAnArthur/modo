import type { ViteDevServer } from 'vite'

/** A plugin's pair of virtual modules: `virtual:modo-<name>` and its stylesheet, `virtual:modo-<name>-css`. */
export function virtualModules(name: string) {
  const id = `\0virtual:modo-${name}`
  const css = `\0virtual:modo-${name}-css`
  return {
    /** The resolved id of the module. */
    id,
    /** The resolved id of the stylesheet module. */
    css,
    resolveId(source: string): string | null {
      if (source === `virtual:modo-${name}`) return id
      if (source === `virtual:modo-${name}-css`) return css
      return null
    },
  }
}

/** A virtual module that only imports stylesheets, in order. */
export function cssModule(files: string[]): string {
  return files.map(f => `import ${JSON.stringify(f)};`).join('\n')
}

/** Drops Vite's cached transforms of the modules `stale` names, then reloads the page. */
export function reload(server: ViteDevServer, stale: (id: string) => boolean): void {
  for (const [id, mod] of server.moduleGraph.idToModuleMap) {
    if (stale(id)) server.moduleGraph.invalidateModule(mod)
  }
  server.ws.send({ type: 'full-reload' })
}
