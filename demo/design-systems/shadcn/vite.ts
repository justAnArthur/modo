import tailwindcss from '@tailwindcss/vite'

/*
 * modo vite extension: appends the Tailwind CSS v4 Vite plugin to the lib's
 * Vite config (see modo.config.ts `vite: './vite.ts'`). The config is typed
 * structurally because `vite` itself is not a direct dependency of this
 * package — at runtime the plugin resolves `vite` through its own deps.
 */
interface UserConfig {
  plugins?: unknown[]
}

export default (config: UserConfig): UserConfig => {
  config.plugins = [...(config.plugins ?? []), tailwindcss()]
  return config
}
