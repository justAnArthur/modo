import { describe, expect, test } from 'bun:test'
import { groupTree } from '../src/runtime/groups'

describe('groupTree', () => {
  test('own items first, then groups by folder, nested', () => {
    const list = [
      { id: 'select', group: 'inputs' },
      { id: 'calendar', group: 'inputs/date-time' },
      { id: 'button' },
      { id: 'dialog', group: 'overlays' },
    ]
    const tree = groupTree(list)
    expect(tree.items.map(it => it.id)).toEqual(['button'])
    expect(tree.groups.map(g => g.title)).toEqual(['Inputs', 'Overlays'])
    expect(tree.groups[0]?.items.map(it => it.id)).toEqual(['select'])
    expect(tree.groups[0]?.groups.map(g => [g.title, g.items.map(it => it.id)])).toEqual([['Date time', ['calendar']]])
  })

  test('titles name folders that do not capitalize well', () => {
    const tree = groupTree(
      [
        { id: 'a', group: 'ui' },
        { id: 'b', group: 'form-controls' },
      ],
      { ui: 'UI' },
    )
    expect(tree.groups.map(g => g.title)).toEqual(['Form controls', 'UI'])
  })
})
