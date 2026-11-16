import { resolve } from 'node:path'
import { withUno } from '../../ui/vite.ts'

export default withUno(resolve(import.meta.dirname, 'uno.config.ts'))
