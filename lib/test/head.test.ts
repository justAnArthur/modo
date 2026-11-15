import { describe, expect, test } from 'bun:test'
import { headTags, pageTitle, withHead } from '../src/lib/head'

const site = { name: 'DS', url: 'https://a.github.io/ds/' }

describe('headTags', () => {
  test('$ patterns in page text stay literal, 404 has no canonical', () => {
    const html = withHead(
      '<head><title>x</title></head>',
      headTags(site, { path: 'x', description: 'Shows $$ and $& here' }),
    )
    expect(html).toContain('Shows $$ and $&amp; here')
    expect(headTags(site, { path: '404', title: 'Not found' })).not.toContain('canonical')
  })

  test('the description is the first paragraph as plain text, cut on a word near 160 characters', () => {
    const long = `${'word '.repeat(40)}end`
    const tags = headTags(site, { path: 'x', description: `A [link](./y) and \`code\`.\n\nSecond.` })
    expect(tags).toContain('<meta name="description" content="A link and code." />')
    const cut = headTags(site, { path: 'x', description: long }).match(/name="description" content="([^"]*)"/)![1]!
    expect(cut.endsWith('word…')).toBe(true)
    expect(cut.length).toBeLessThanOrEqual(158)
  })
})

describe('pageTitle', () => {
  test('page · site, or the site alone', () => {
    expect([pageTitle('DS', 'Button'), pageTitle('DS'), pageTitle('DS', 'DS')]).toEqual(['Button · DS', 'DS', 'DS'])
  })
})

describe('withHead', () => {
  test('swaps the marked block, else the bare title', () => {
    const tags = headTags(site, { path: '', title: 'A' })
    const marked = withHead(`<head>${headTags(site, { path: '', title: 'B' })}</head>`, tags)
    expect([marked.match(/<title>[^<]*<\/title>/g), withHead('<head><title>x</title></head>', tags)]).toEqual([
      ['<title>A · DS</title>'],
      `<head>${tags}</head>`,
    ])
  })
})
