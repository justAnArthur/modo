import * as Babel from '@babel/standalone'
import { createElement, Fragment, type ComponentType, type ReactElement } from 'react'

export type ExampleRenderer = (componentMap: Record<string, ComponentType<any>>) => ReactElement | null

const cache = new Map<string, ExampleRenderer | string>()

const BINDINGS = ['Button', 'Link', 'Code', 'Sidebar', 'Panel']
  .map((n) => `var ${n} = Components.${n};`)
  .join('\n')

function bindingsFor(code: string): string {
  const tags = [...code.matchAll(/<([A-Z]\w*)/g)].map((m) => m[1] ?? '')
  const unique = [...new Set([...tags, 'Button', 'Link', 'Code', 'Sidebar', 'Panel'])]
  return unique.map((n) => `var ${n} = Components.${n};`).join('\n')
}

const REACT_STUB = { createElement, Fragment }

export function compileExampleBody(code: string): ExampleRenderer | string {
  const cached = cache.get(code)
  if (cached !== undefined) return cached

  let js: string
  try {
    const wrapped = /\n/.test(code) ? `<>${code}</>` : code
    const out = Babel.transform(wrapped, {
      presets: ['typescript', 'react'],
      filename: 'example.tsx',
    })
    js = (out.code ?? '').replace(/['"]use strict['"];?/, '')
  } catch {
    cache.set(code, code)
    return code
  }

  const body = `${bindingsFor(code)}\n${js}`
  const g = globalThis as Record<string, unknown>
  const renderer: ExampleRenderer = (componentMap) => {
    try {
      g.Components = componentMap
      g.React = REACT_STUB
      const r = (0, eval)(body)
      return (r as ReactElement | null) ?? null
    } catch {
      return null
    }
  }
  cache.set(code, renderer)
  return renderer
}

export function isCompiledExample(value: unknown): value is ExampleRenderer {
  return typeof value === 'function'
}
