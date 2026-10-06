import type { SiteConfig } from '../lib/schema'

/** Types a modo.config.ts: `export default defineConfig({ name: 'My DS' })`. */
export function defineConfig(config: SiteConfig): SiteConfig {
  return config
}
