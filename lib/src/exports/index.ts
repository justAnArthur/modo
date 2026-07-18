// type-only public API
export { defineConfig } from './config'

// re-export the React primitives for the surfaces elevation model.
// the user imports these in their components: <Elevated offset={2}>...
// available via the . runtime entry (./surfaces-runtime) to keep the
// type-only subpath deps-free of react.
export { Elevated, SurfaceProvider, useSurface } from './surfaces-runtime'

export type {
  SiteConfig,
  ColorGroup,
  ColorToken,
  SurfaceGroup,
  SurfaceLevel,
  SurfaceConvention,
  ItemMeta,
  ItemSchema,
  ItemCategory,
  PropSchema,
  PropType,
  ExampleSchema,
  Semantic,
  Role,
} from './schema'
