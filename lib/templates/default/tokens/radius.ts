import { defineTokens } from 'modo-atomic-ui/tokens'

export default defineTokens({
  group: 'radius',
  description: 'Border radius scale. Sharp = 0, fully rounded = 9999px.',
  scale: {
    none:    { value: '0',       description: 'no rounding' },
    sm:      { value: '4px',     description: 'subtle — badges, small chips' },
    md:      { value: '6px',     description: 'controls, inputs' },
    lg:      { value: '8px',     description: 'cards, buttons' },
    xl:      { value: '12px',    description: 'popovers, dialogs' },
    '2xl':   { value: '16px',    description: 'large surfaces' },
    '3xl':   { value: '24px',    description: 'hero cards' },
    full:    { value: '9999px',  description: 'pills, avatars' },
  },
})
