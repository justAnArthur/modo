import { defineSurfaces } from 'modo-atomic-ui/surfaces'

export default defineSurfaces({
  group: 'surfaces',
  description: '8 nested surface levels, each paired with a shadow recipe. Components lift relative to their substrate.',
  levels: {
    '1': { bg: 'surface-1', shadow: 'shadow-1' },
    '2': { bg: 'surface-2', shadow: 'shadow-2' },
    '3': { bg: 'surface-3', shadow: 'shadow-3' },
    '4': { bg: 'surface-4', shadow: 'shadow-4' },
    '5': { bg: 'surface-5', shadow: 'shadow-5' },
    '6': { bg: 'surface-6', shadow: 'shadow-6' },
    '7': { bg: 'surface-7', shadow: 'shadow-7' },
    '8': { bg: 'surface-8', shadow: 'shadow-8' },
  },
  conventions: {
    dropdown:  { offset: 2, description: 'dropdown / popover / select menu' },
    tooltip:   { offset: 3, description: 'tooltip' },
    dialog:    { offset: 4, description: 'dialog / modal' },
    palette:   { offset: 6, description: 'command palette' },
  },
})
