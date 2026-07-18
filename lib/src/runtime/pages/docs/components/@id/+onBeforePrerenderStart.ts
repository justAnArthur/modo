import { listTier } from '../../../../prerender-helpers'

export const onBeforePrerenderStart = async () => {
  const items = await listTier('components')
  return items.map((id) => `/docs/components/${id}`)
}
