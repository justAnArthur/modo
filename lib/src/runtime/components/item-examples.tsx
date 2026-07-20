// renders the @example blocks for an item. used by both the home
// page (where each item is a section) and the per-item page.

import type { ComponentType } from 'react'
import type { ParsedExample } from '../../exports/tsdoc'
import { ExampleBlock } from './example-renderer'

interface ItemExamplesProps {
  examples: ParsedExample[]
  componentName: string
  Component: ComponentType<any> | null
  compiledBodies: Record<number, string>
}

export function ItemExamples({ examples, componentName, Component, compiledBodies }: ItemExamplesProps) {
  return (
    <div data-aui="examples">
      {examples.map((ex, i) => (
        <ExampleBlock
          key={i}
          example={ex}
          componentName={componentName}
          Component={Component}
          compiledBody={compiledBodies[i]}
        />
      ))}
    </div>
  )
}
