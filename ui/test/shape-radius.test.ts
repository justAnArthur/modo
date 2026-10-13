import { describe, expect, test } from 'bun:test'
import { claimShapeRadius, type ShapeRadiusRoot } from '../lib/shape-radius'

const PROPERTY = '--shape-input-radius'

/** A stand-in for `<html>`: just the inline style's custom properties. */
function fakeRoot(initial?: string) {
  const values = new Map<string, string>(initial ? [[PROPERTY, initial]] : [])
  const root: ShapeRadiusRoot = {
    style: {
      setProperty: (name, value) => void values.set(name, String(value)),
      getPropertyValue: name => values.get(name) ?? '',
      removeProperty: name => {
        const old = values.get(name) ?? ''
        values.delete(name)
        return old
      },
    },
  }
  return { root, read: () => root.style.getPropertyValue(PROPERTY) }
}

describe('claimShapeRadius', () => {
  test('publishes the radius, and removes it again once the only provider unmounts', () => {
    const { root, read } = fakeRoot()
    const claim = claimShapeRadius(root, '20px')
    expect(read()).toBe('20px')
    claim.release()
    expect(read()).toBe('')
  })

  test('a shape change updates the published radius', () => {
    const { root, read } = fakeRoot()
    const claim = claimShapeRadius(root, '8px')
    claim.update('20px')
    expect(read()).toBe('20px')
    claim.release()
    expect(read()).toBe('')
  })

  test('the inner provider unmounting hands the property back to the outer one', () => {
    const { root, read } = fakeRoot()
    const outer = claimShapeRadius(root, '8px')
    const inner = claimShapeRadius(root, '20px')
    expect(read()).toBe('20px')
    inner.release()
    expect(read()).toBe('8px')
    outer.release()
    expect(read()).toBe('')
  })

  test('the outer provider unmounting first leaves the inner one showing', () => {
    const { root, read } = fakeRoot()
    const outer = claimShapeRadius(root, '8px')
    const inner = claimShapeRadius(root, '20px')
    outer.release()
    expect(read()).toBe('20px')
    inner.release()
    expect(read()).toBe('')
  })

  test('an update to a claim below the top does not displace the top', () => {
    const { root, read } = fakeRoot()
    const outer = claimShapeRadius(root, '8px')
    const inner = claimShapeRadius(root, '20px')
    outer.update('12px')
    expect(read()).toBe('20px')
    inner.release()
    expect(read()).toBe('12px')
    outer.release()
  })

  test('what the page had before the first provider comes back', () => {
    const { root, read } = fakeRoot('14px')
    const claim = claimShapeRadius(root, '20px')
    claim.release()
    expect(read()).toBe('14px')
  })

  test('a released claim is released once', () => {
    const { root, read } = fakeRoot()
    const outer = claimShapeRadius(root, '8px')
    const inner = claimShapeRadius(root, '20px')
    inner.release()
    inner.release()
    expect(read()).toBe('8px')
    outer.release()
  })
})
