// /docs/tokens/:group — per-token-group page.
import { tokens, errors as tokensErrors } from 'virtual:modo-tokens'
import { usePageContext } from 'vike-react/usePageContext'
import { TokenGroup } from '../../../../components/token-renderers'

export default function TokenPage() {
  const pageContext = usePageContext()
  const group = (pageContext.routeParams as { group: string }).group
  const data = (tokens as Record<string, any>)[group]

  if (!data) {
    return (
      <>
        <h1 data-aui="page-title">token group not found</h1>
        <p>no tokens for group <code>{group}</code>.</p>
      </>
    )
  }

  return (
    <>
      <h1 data-aui="page-title">{group}</h1>
      {data.description && <p data-aui="page-lead">{data.description}</p>}

      {tokensErrors.length > 0 && (
        <div data-aui="errors">{tokensErrors.join('\n')}</div>
      )}

      <TokenGroup group={group} data={data} />
    </>
  )
}
