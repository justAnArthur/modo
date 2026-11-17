import { describe, expect, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import Combobox from '../components/inputs/combobox'

const items = [
  { value: 'A', label: 'Alpha' },
  { value: 'B', label: 'Beta' },
]

const inputValue = (html: string) => html.match(/<input[^>]*role="combobox"[^>]*>/)?.[0].match(/value="([^"]*)"/)?.[1]

describe('Combobox', () => {
  test('a picked value fills the field with its label', () => {
    const html = renderToStaticMarkup(
      <Combobox items={items} defaultValue="B">
        <Combobox.Input />
      </Combobox>,
    )
    expect(inputValue(html)).toBe('Beta')
  })

  test('defaultQuery wins over the picked label', () => {
    const html = renderToStaticMarkup(
      <Combobox items={items} defaultValue="B" defaultQuery="Be">
        <Combobox.Input />
      </Combobox>,
    )
    expect(inputValue(html)).toBe('Be')
  })
})
