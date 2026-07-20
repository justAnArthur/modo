// public API — type-only.
//
// the lib ships no React components, hooks, or visual primitives.
// everything consumer-facing (elevation, layouts, etc.) is host
// content — see AGENTS.md ("libs are zero content defaults").

export { defineConfig } from './config'

export type { SiteConfig } from './schema'
