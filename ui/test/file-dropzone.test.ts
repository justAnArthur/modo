import { describe, expect, test } from 'bun:test'
import { acceptsFile, dragVerdict, formatFileSize, sortFiles } from '../components/inputs/file-dropzone/variants'

const file = (name: string, type: string, size = 1) => new File([new Uint8Array(size)], name, { type })

describe('acceptsFile', () => {
  test('reads extensions, wildcards and exact types', () => {
    expect(acceptsFile(file('a.PDF', 'application/pdf'), '.pdf')).toBe(true)
    expect(acceptsFile(file('a.png', 'image/png'), 'image/*')).toBe(true)
    expect(acceptsFile(file('a.txt', 'text/plain'), '.pdf, image/*')).toBe(false)
    expect(acceptsFile(file('a.txt', 'text/plain'))).toBe(true)
  })
})

describe('sortFiles', () => {
  test('rejects by type, then size, then count', () => {
    const { accepted, rejected } = sortFiles(
      [
        file('a.pdf', 'application/pdf', 10),
        file('b.txt', 'text/plain'),
        file('c.png', 'image/png', 99),
        file('d.pdf', 'application/pdf'),
      ],
      { accept: '.pdf,image/*', maxSize: 50, maxFiles: 1, multiple: true },
    )
    expect(accepted.map(f => f.name)).toEqual(['a.pdf'])
    expect(rejected.map(r => [r.file.name, r.reason])).toEqual([
      ['b.txt', 'type'],
      ['c.png', 'size'],
      ['d.pdf', 'count'],
    ])
  })

  test('takes one file without multiple', () => {
    const { accepted, rejected } = sortFiles([file('a.png', 'image/png'), file('b.png', 'image/png')], {})
    expect(accepted).toHaveLength(1)
    expect(rejected[0]?.reason).toBe('count')
  })
})

describe('dragVerdict', () => {
  test('refuses only a drag where nothing can pass', () => {
    expect(dragVerdict(['text/plain'], 'image/*', 1)).toBe('reject')
    expect(dragVerdict(['image/png', 'text/plain'], 'image/*', 5)).toBe('partial')
    expect(dragVerdict(['image/png', 'image/png'], 'image/*', 1)).toBe('partial')
    expect(dragVerdict(['image/png'], 'image/*', 1)).toBe('accept')
    expect(dragVerdict(['image/png'], 'image/*', 0)).toBe('reject')
  })

  test('passes what a drag cannot judge: extensions and empty types', () => {
    expect(dragVerdict(['text/plain'], '.pdf', 1)).toBe('accept')
    expect(dragVerdict([''], 'image/*', 1)).toBe('accept')
  })
})

describe('formatFileSize', () => {
  test('writes decimal units, bytes as B', () => {
    expect(formatFileSize(512, 'en-US')).toBe('512 B')
    expect(formatFileSize(2_480_000, 'en-US')).toBe('2.5 MB')
  })
})
