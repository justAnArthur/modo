import type { ReactElement } from 'react'
import { byName, examples as examplesMap } from 'virtual:modo-items'
import { compileExampleBody, isCompiledExample } from '../../lib/example'

/** The item's first `@example`, compiled and rendered — the same path the item
    page uses, so an overview shows the real component, not a screenshot. */
export function ExamplePreview({ itemId }: { itemId: string }): ReactElement | null {
  const example = (examplesMap[itemId] ?? [])[0]
  const compiled = example ? compileExampleBody(example.code) : null
  const rendered = isCompiledExample(compiled) ? compiled(byName) : null
  if (rendered) return rendered
  return <span data-modo="bento-empty">{example ? 'Example did not compile' : 'No example yet'}</span>
}
