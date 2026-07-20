// re-export from the demo's elevation primitives. the lib's
// virtual:modo-elevated resolves to this file. the source plugin
// marks this file as external (see lib/src/runtime/plugins/_helpers.ts)
// so item bundles share the same module instance as the lib's runtime.
//
// expose every primitive (default + named) — the lib's virtual module
// grabs the default, but user components (popover, surface, etc.) import
// different combinations as named exports.
export {
  Elevated as default,
  Elevated,
  SurfaceProvider,
  useSurface,
  useCurrentSurfaceLevel,
} from '../../components/surface/elevated'
