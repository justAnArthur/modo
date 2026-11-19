import { resolve } from 'node:path'
import { withUno } from '@justanarthur/modo-ui/docs/vite'

export default withUno(resolve(import.meta.dirname, 'uno.config.ts'))
