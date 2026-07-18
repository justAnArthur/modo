import type { Config } from 'vike'
import vikeReact from 'vike-react/config'

// SSG: pre-render all pages at build time.
// dynamic routes (@id, @group) each supply their own onBeforePrerenderStart
// to enumerate the user's project — see _prerender-helpers.ts.
export default {
  extends: vikeReact,
  prerender: {
    enable: true,
  },
} satisfies Config
