import { describe, expect, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import Dialog from '../components/overlays/dialog'
import Dropdown from '../components/overlays/dropdown'
import Popover from '../components/overlays/popover'
import Tooltip from '../components/overlays/tooltip'

describe('slot parts', () => {
  test('children fill a childless render element', () => {
    const html = renderToStaticMarkup(
      <>
        <Popover>
          <Popover.Trigger render={<button type="button" />}>Popover</Popover.Trigger>
        </Popover>
        <Dialog>
          <Dialog.Trigger render={<button type="button" />}>Dialog</Dialog.Trigger>
        </Dialog>
        <Dropdown.Menu>
          <Dropdown.Trigger render={<button type="button" />}>Dropdown</Dropdown.Trigger>
        </Dropdown.Menu>
        <Tooltip.Provider>
          <Tooltip>
            <Tooltip.Trigger render={<button type="button" />}>Tooltip</Tooltip.Trigger>
          </Tooltip>
        </Tooltip.Provider>
      </>,
    )
    for (const name of ['Popover', 'Dialog', 'Dropdown', 'Tooltip'])
      expect(html).toMatch(new RegExp(`<button[^>]*>${name}</button>`))
  })

  test("a render element's own children win", () => {
    const html = renderToStaticMarkup(
      <Popover>
        <Popover.Trigger render={<button type="button">Own</button>}>Given</Popover.Trigger>
      </Popover>,
    )
    expect(html).toMatch(/<button[^>]*>Own<\/button>/)
  })
})
