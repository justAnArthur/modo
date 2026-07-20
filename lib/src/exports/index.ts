// public API — type-only + the surfaces elevation primitives.
//
// consumers should import the React primitives (`Elevated`,
// `SurfaceProvider`, `useSurface`) from the main entry, e.g.
//   import { Elevated } from 'modo-atomic-ui'
// the `modo-atomic-ui/surfaces-runtime` subpath is kept for backwards
// compat with v0.0.x; new code should use the main entry.

export { defineConfig } from './config'

export { Elevated, SurfaceProvider, useSurface } from './surfaces-runtime'

export type { SiteConfig } from './schema'
