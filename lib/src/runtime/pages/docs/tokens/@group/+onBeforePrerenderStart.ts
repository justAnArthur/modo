import { listTokens } from '../../../../prerender-helpers'

export const onBeforePrerenderStart = async () => {
  const groups = await listTokens()
  return groups.map((g) => `/docs/tokens/${g}`)
}
