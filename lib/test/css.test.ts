import { describe, expect, test } from 'bun:test'
import { buildGroup, lightDark, parseCss, schemePair } from '../src/lib/css'

describe('parseCss', () => {
  test('the last declaration in a block needs no `;`', () => {
    expect(parseCss(':root { --a: red }\n.dark { --b: blue; }').map(v => [v.name, v.value])).toEqual([
      ['--a', 'red'],
      ['--b', 'blue'],
    ])
  })

  test('typography by name: weights, leading and tracking are not sizes', () => {
    const vars = parseCss(
      ':root { --leading-tight: 1.25; --tracking-tight: -0.01em; --font-weight-bold: 700; --text-h1: 6rem; --font-sans: Inter }',
    )
    expect(buildGroup('typography', vars).vars.map(v => v.swatch?.kind)).toEqual([
      undefined,
      undefined,
      'font-weight',
      'font-size',
      'font-family',
    ])
  })

  test('a type role classifies by what it references; its color has no swatch', () => {
    const vars = parseCss(
      ':root { --text-body: 13px; --font-size-p: var(--text-body); --line-height-p: 20px; --color-p: var(--muted) }',
    )
    expect(buildGroup('typography', vars).vars.map(v => v.swatch?.kind)).toEqual([
      'font-size',
      'font-size',
      undefined,
      undefined,
    ])
  })
})

describe('color schemes', () => {
  test('a block is dark only when every selector in it is', () => {
    const css =
      ':root { --a: white } .dark { --a: black } :root, .light, .dark { --b: red } @media (prefers-color-scheme: dark) { :root { --c: gray } }'
    expect(parseCss(css).map(v => [v.name, v.scheme])).toEqual([
      ['--a', undefined],
      ['--a', 'dark'],
      ['--b', undefined],
      ['--c', 'dark'],
    ])
  })

  test('a pair comes from a dark redeclaration or from light-dark()', () => {
    const vars = parseCss(
      ':root { --a: white; --b: light-dark(snow, color-mix(in oklab, black 50%, transparent)); --c: red } .dark { --a: black }',
    )
    expect(schemePair(vars, '--a')).toEqual({ light: 'white', dark: 'black' })
    expect(schemePair(vars, '--b')).toEqual({ light: 'snow', dark: 'color-mix(in oklab, black 50%, transparent)' })
    expect(schemePair(vars, '--c')).toBeNull()
    expect(lightDark('red')).toBeNull()
  })
})
