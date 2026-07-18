import type { Config } from 'vike'
import vikeReact from 'vike-react/config'

// the home page renders its own <title> and meta description via the
// site name/description from `virtual:modo-config` (i.e. from the user's
// modo.config.ts). the static `title`/`description` here is the fallback
// for the pre-render pass before the React tree mounts.
export default {
  extends: vikeReact,
  title: 'modo-atomic-ui',
  description: 'atomic design system renderer',
} satisfies Config
