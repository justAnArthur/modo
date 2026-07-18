import { listTier } from '../../../../prerender-helpers'

export const onBeforePrerenderStart = async () => {
  const items = await listTier('blocks')
  return items.map((id) => `/docs/blocks/${id}`)
}
