import { describe, expect, test } from 'bun:test'
import { headTags, withHead } from '../src/lib/head'

describe('headTags', () => {
  test('$ patterns in page text stay literal, 404 has no canonical', () => {
    const site = { name: 'DS', url: 'https://a.github.io/ds/' }
    const html = withHead(
      '<head><title>x</title></head>',
      headTags(site, { path: 'x', description: 'Shows $$ and $& here' }),
    )
    expect(html).toContain('Shows $$ and $&amp; here')
    expect(headTags(site, { path: '404', title: 'Not found' })).not.toContain('canonical')
  })
})
