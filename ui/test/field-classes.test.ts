import { describe, expect, test } from 'bun:test'
import type { MouseEvent, RefObject } from 'react'
import { focusControlOnPress } from '../lib/field-classes'

/** A node tree stand-in: `contains` is true for itself and its descendants. */
class FakeNode {
  readonly children: FakeNode[] = []
  constructor(parent?: FakeNode) {
    parent?.children.push(this)
  }
  contains(node: FakeNode): boolean {
    return node === this || this.children.some(child => child.contains(node))
  }
}

function press(box: FakeNode, target: FakeNode, control: FakeNode) {
  const calls = { prevented: 0, focused: 0 }
  const ref = { current: Object.assign(control, { focus: () => calls.focused++ }) } as unknown as RefObject<HTMLElement>
  const event = { target, currentTarget: box, preventDefault: () => calls.prevented++ } as unknown as MouseEvent
  focusControlOnPress(ref)(event)
  return calls
}

describe('focusControlOnPress', () => {
  test('a press on the box padding or an icon focuses the control and keeps the browser from moving focus', () => {
    const box = new FakeNode()
    const control = new FakeNode(box)
    const icon = new FakeNode(box)
    expect(press(box, box, control)).toEqual({ prevented: 1, focused: 1 })
    expect(press(box, icon, control)).toEqual({ prevented: 1, focused: 1 })
  })

  test('a press on the control itself is left to the browser, so the caret lands where it was pressed', () => {
    const box = new FakeNode()
    const control = new FakeNode(box)
    expect(press(box, control, control)).toEqual({ prevented: 0, focused: 0 })
  })

  test('a press in a popup portalled out of the box (it only bubbles through the React tree) is left alone', () => {
    const box = new FakeNode()
    const control = new FakeNode(box)
    const popupSearch = new FakeNode()
    expect(press(box, popupSearch, control)).toEqual({ prevented: 0, focused: 0 })
  })
})
