import { resolve } from 'node:path'
import { withUno } from './docs/vite.ts'

/*
 * modo vite extension (modo.config.ts `vite: './vite.ts'`): UnoCSS over this
 * package's uno config, plus the theme script (`withUno`, docs/vite.ts, which
 * kits and other hosts import as `@justanarthur/modo-ui/docs/vite`).
 *
 * Node loads this file directly with type stripping, so it may only use
 * erasable TypeScript; the uno config is handed to UnoCSS by absolute path
 * (Vite's root is modo's runtime dir, not this package).
 */

export default withUno(resolve(import.meta.dirname, 'uno.config.ts'))
