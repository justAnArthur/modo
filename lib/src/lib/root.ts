import { resolve } from 'node:path'
import type { SiteConfig } from './schema'

/**
 * The folder the item tiers and `tokens/` live in: `config.root` resolved against
 * the project root (the cwd the CLI was started in), else the project root itself.
 */
export function itemsRootOf(userRoot: string, config: Pick<SiteConfig, 'root'> | null | undefined): string {
  return resolve(userRoot, config?.root ?? '.')
}
