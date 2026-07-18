import type { SiteConfig } from './schema'

/**
 * defines a site config. type-only; runtime values pass through unchanged.
 * the lib validates the object against the zod schema at dev/build time.
 */
export function defineConfig(config: SiteConfig): SiteConfig {
  return config
}
