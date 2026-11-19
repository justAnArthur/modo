import { describe, expect, test } from 'bun:test'
import { sitePath, siteRouteId } from '../src/lib/paths'
import { siteConfigSchema } from '../src/lib/schema'
import { sitePages } from '../src/runtime/groups'

describe('siteRouteId', () => {
  test('/site is the first page, /site/<id> that page', () => {
    expect(siteRouteId('/site', false)).toBe('')
    expect(siteRouteId('/site/home', false)).toBe('home')
    expect(siteRouteId(sitePath('home'), false)).toBe('home')
  })

  test('/ is the site only when it is home', () => {
    expect(siteRouteId('/', false)).toBeUndefined()
    expect(siteRouteId('/', true)).toBe('')
  })

  test('docs paths and deeper paths are not site routes', () => {
    for (const path of ['/docs', '/docs/pages/home', '/canvas', '/sites', '/site/a/b']) {
      expect(siteRouteId(path, true)).toBeUndefined()
    }
  })
})

describe('sitePages', () => {
  const items = [
    { id: 'button', tier: 'primitives' },
    { id: 'faq', tier: 'pages', group: 'brand' },
    { id: 'layering', tier: 'pages' },
    { id: 'home', tier: 'pages', group: 'brand' },
  ]
  const ids = (list: { id: string }[]) => list.map(it => it.id)

  test('every page in nav order: own pages first, then groups', () => {
    expect(ids(sitePages(items))).toEqual(['layering', 'faq', 'home'])
  })

  test('primary picks and orders them, skipping unknown ids', () => {
    expect(ids(sitePages(items, ['home', 'nope', 'faq']))).toEqual(['home', 'faq'])
  })

  test('primary without a known id falls back to every page', () => {
    expect(ids(sitePages(items, ['nope']))).toEqual(['layering', 'faq', 'home'])
    expect(ids(sitePages(items, []))).toEqual(['layering', 'faq', 'home'])
  })
})

describe('pages config', () => {
  test('accepts primary and home, rejects unknown keys', () => {
    expect(siteConfigSchema.safeParse({ name: 'x', pages: { primary: ['home'], home: true } }).success).toBe(true)
    expect(siteConfigSchema.safeParse({ name: 'x', pages: { dir: 'p' } }).success).toBe(false)
  })
})
