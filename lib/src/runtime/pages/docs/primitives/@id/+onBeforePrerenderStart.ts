import { listTier } from '../../../../prerender-helpers'

export const onBeforePrerenderStart = async () => {
  const items = await listTier('primitives')
  return items.map((id) => `/docs/primitives/${id}`)
}
