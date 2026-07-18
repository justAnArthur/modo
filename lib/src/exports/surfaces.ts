import type { SurfaceGroup } from './schema'

/**
 * defines a surfaces token group (the 8-level elevation ladder).
 * type-only at runtime; the lib validates against the zod schema.
 */
export function defineSurfaces(group: SurfaceGroup): SurfaceGroup {
  return group
}
